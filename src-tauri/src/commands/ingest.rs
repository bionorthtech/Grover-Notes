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

    // ── Integration tests against a tiny in-process HTTP server ──────────────
    // Exercises the real reqwest fetch/download/write paths without external
    // network so the command code is covered.

    use std::io::{Read, Write};
    use std::net::TcpListener;

    /// Serve canned responses on an ephemeral port and return its base URL.
    /// Routes: `/missing` → 404; any path ending `.png`/`.jpg` → 4 bytes of the
    /// last path segment's first char; everything else → a text body.
    fn start_test_server() -> String {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        std::thread::spawn(move || {
            for stream in listener.incoming() {
                let mut stream = match stream {
                    Ok(stream) => stream,
                    Err(_) => continue,
                };
                let mut buf = [0u8; 1024];
                let read = stream.read(&mut buf).unwrap_or(0);
                let request = String::from_utf8_lossy(&buf[..read]);
                let path = request.split_whitespace().nth(1).unwrap_or("/").to_string();
                let (status, body) = route(&path);
                let response = format!(
                    "HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    body.len()
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.write_all(&body);
            }
        });
        base
    }

    fn route(path: &str) -> (&'static str, Vec<u8>) {
        if path.contains("missing") {
            ("404 Not Found", b"nope".to_vec())
        } else if path.ends_with(".png") || path.ends_with(".jpg") {
            ("200 OK", b"DATA".to_vec())
        } else {
            ("200 OK", b"hello body".to_vec())
        }
    }

    fn run<F: std::future::Future>(future: F) -> F::Output {
        tokio::runtime::Runtime::new().unwrap().block_on(future)
    }

    #[test]
    fn ingest_fetch_returns_body_text() {
        let base = start_test_server();
        let body = run(ingest_fetch(format!("{base}/thread.json"), None)).unwrap();
        assert_eq!(body, "hello body");
    }

    #[test]
    fn ingest_fetch_rejects_non_http_scheme() {
        let error = run(ingest_fetch("file:///etc/passwd".into(), None)).unwrap_err();
        assert!(error.contains("http"));
    }

    #[test]
    fn ingest_fetch_errors_on_http_failure_status() {
        let base = start_test_server();
        let error = run(ingest_fetch(format!("{base}/missing"), None)).unwrap_err();
        assert!(error.contains("404"));
    }

    #[test]
    fn download_assets_writes_files_and_aligns_results() {
        let base = start_test_server();
        let dir = tempfile::tempdir().unwrap();
        let vault = dir.path().to_string_lossy().into_owned();
        let urls = vec![
            format!("{base}/x/photo.jpg"), // ok → photo.jpg
            "ftp://example.com/skip.png".to_string(), // invalid scheme → ""
            format!("{base}/y/photo.jpg"), // same basename → 2-photo.jpg
            format!("{base}/missing.png"), // 404 → ""
        ];
        let saved = run(ingest_download_assets(vault, "assets".into(), urls, None)).unwrap();

        assert_eq!(saved, vec!["photo.jpg", "", "2-photo.jpg", ""]);
        let asset_dir = dir.path().join("assets");
        assert_eq!(fs::read(asset_dir.join("photo.jpg")).unwrap(), b"DATA");
        assert_eq!(fs::read(asset_dir.join("2-photo.jpg")).unwrap(), b"DATA");
        assert!(!asset_dir.join("missing.png").exists());
    }

    #[test]
    fn download_assets_returns_empty_for_no_urls() {
        let dir = tempfile::tempdir().unwrap();
        let vault = dir.path().to_string_lossy().into_owned();
        let saved = run(ingest_download_assets(vault, "assets".into(), vec![], None)).unwrap();
        assert!(saved.is_empty());
    }
}
