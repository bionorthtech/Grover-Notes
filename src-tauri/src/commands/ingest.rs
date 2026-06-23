use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

/// Descriptive User-Agent. Reddit and several forums reject the default reqwest
/// agent (and browser fetches hit CORS), so live fetching happens here in Rust
/// with a stable, identifiable agent string.
const DEFAULT_USER_AGENT: &str = concat!("GroverNotes/", env!("CARGO_PKG_VERSION"), " (archival ingest)");

/// Reject anything that isn't an http(s) URL before we hand it to reqwest, so a
/// `file://` or other scheme can't be coerced into reading local resources.
fn validate_http_url(url: &str) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        Ok(())
    } else {
        Err("Only http(s) URLs can be fetched.".into())
    }
}

/// Pick the User-Agent to send: the caller's override when non-empty, otherwise
/// our descriptive default.
fn resolve_user_agent(user_agent: Option<String>) -> String {
    user_agent
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_USER_AGENT.to_string())
}

/// Derive a safe on-disk filename for a downloaded asset from its URL, keeping
/// only the final path segment and stripping anything that isn't filename-safe.
fn asset_file_name(url: &str, index: usize) -> String {
    let tail = url
        .split(['?', '#'])
        .next()
        .unwrap_or(url)
        .rsplit('/')
        .next()
        .unwrap_or("")
        .trim();
    let cleaned: String = tail
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_'))
        .collect();
    if cleaned.is_empty() || cleaned == "." || cleaned == ".." {
        format!("asset-{index}")
    } else {
        cleaned
    }
}

fn blocking_get(url: &str, user_agent: &str) -> Result<reqwest::blocking::Response, String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent(user_agent)
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| format!("Could not build HTTP client: {error}"))?;
    let response = client
        .get(url)
        .send()
        .map_err(|error| format!("Request failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("Request failed with status {}", response.status()));
    }
    Ok(response)
}

/// Fetch a URL's body as text. Runs the blocking request off the async runtime.
#[tauri::command]
pub async fn ingest_fetch(url: String, user_agent: Option<String>) -> Result<String, String> {
    validate_http_url(&url)?;
    let agent = resolve_user_agent(user_agent);
    tokio::task::spawn_blocking(move || {
        let response = blocking_get(&url, &agent)?;
        response
            .text()
            .map_err(|error| format!("Could not read response body: {error}"))
    })
    .await
    .map_err(|error| format!("Fetch task failed: {error}"))?
}

/// Ensure the chosen filename is unique within this batch so two assets that
/// share a basename (e.g. `a.com/x/photo.jpg` and `b.com/y/photo.jpg`) don't
/// clobber each other on disk and end up referenced as the same local file.
/// Records the returned name in `used`.
fn unique_asset_name(base: &str, index: usize, used: &mut HashSet<String>) -> String {
    let name = if used.contains(base) {
        format!("{index}-{base}")
    } else {
        base.to_string()
    };
    used.insert(name.clone());
    name
}

fn download_asset_to(dir: &Path, url: &str, name: &str, agent: &str) -> Result<(), String> {
    let response = blocking_get(url, agent)?;
    let bytes = response
        .bytes()
        .map_err(|error| format!("Could not read asset bytes: {error}"))?;
    let target = dir.join(name);
    fs::write(&target, &bytes).map_err(|error| format!("Could not write asset: {error}"))?;
    Ok(())
}

/// Download a list of asset URLs into `<vault>/<dest_dir>` and return the saved
/// filenames index-aligned with `urls` (an empty string marks an asset that was
/// skipped or failed). Failing a single asset doesn't fail the whole import.
#[tauri::command]
pub async fn ingest_download_assets(
    vault_path: String,
    dest_dir: String,
    urls: Vec<String>,
    user_agent: Option<String>,
) -> Result<Vec<String>, String> {
    let agent = resolve_user_agent(user_agent);
    let base = super::expand_tilde(&vault_path).into_owned();
    tokio::task::spawn_blocking(move || {
        let dir: PathBuf = Path::new(&base).join(&dest_dir);
        fs::create_dir_all(&dir).map_err(|error| format!("Could not create asset dir: {error}"))?;
        let mut used: HashSet<String> = HashSet::new();
        // Index-aligned with `urls`: an empty string marks an asset that was
        // skipped (non-http) or failed to download, so the caller's rewrite step
        // keeps that asset's original remote URL instead of mismapping it.
        let saved = urls
            .iter()
            .enumerate()
            .map(|(index, url)| {
                if validate_http_url(url).is_err() {
                    return String::new();
                }
                let name = unique_asset_name(&asset_file_name(url, index), index, &mut used);
                match download_asset_to(&dir, url, &name, &agent) {
                    Ok(()) => name,
                    Err(_) => String::new(),
                }
            })
            .collect::<Vec<_>>();
        Ok(saved)
    })
    .await
    .map_err(|error| format!("Asset download task failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_http_and_https_only() {
        assert!(validate_http_url("https://example.com/x.json").is_ok());
        assert!(validate_http_url("  http://example.com  ").is_ok());
        assert!(validate_http_url("file:///etc/passwd").is_err());
        assert!(validate_http_url("ftp://example.com").is_err());
        assert!(validate_http_url("not a url").is_err());
    }

    #[test]
    fn resolves_user_agent_with_fallback() {
        assert_eq!(resolve_user_agent(Some("Custom/1.0".into())), "Custom/1.0");
        assert_eq!(resolve_user_agent(Some("  ".into())), DEFAULT_USER_AGENT);
        assert_eq!(resolve_user_agent(None), DEFAULT_USER_AGENT);
    }

    #[test]
    fn derives_safe_asset_file_names() {
        assert_eq!(asset_file_name("https://i.redd.it/abc123.png", 0), "abc123.png");
        assert_eq!(
            asset_file_name("https://cdn.example.com/path/photo.jpg?width=800", 1),
            "photo.jpg"
        );
        assert_eq!(asset_file_name("https://example.com/", 2), "asset-2");
        assert_eq!(asset_file_name("https://example.com/../../etc", 3), "etc");
    }

    #[test]
    fn disambiguates_colliding_asset_names() {
        let mut used = HashSet::new();
        assert_eq!(unique_asset_name("photo.jpg", 0, &mut used), "photo.jpg");
        // Same basename from a different URL must not clobber the first file.
        assert_eq!(unique_asset_name("photo.jpg", 1, &mut used), "1-photo.jpg");
        assert_eq!(unique_asset_name("photo.jpg", 2, &mut used), "2-photo.jpg");
        // A genuinely different name is kept as-is.
        assert_eq!(unique_asset_name("other.png", 3, &mut used), "other.png");
    }

    #[test]
    fn rejects_path_traversal_in_asset_names() {
        let name = asset_file_name("https://example.com/..", 5);
        assert_eq!(name, "asset-5");
        assert!(!name.contains('/'));
    }
}
