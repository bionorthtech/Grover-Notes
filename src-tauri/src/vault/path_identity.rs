use std::path::Path;

type PathText = str;
type RelativePathText = str;

fn normalize_tmp_alias(path: &PathText) -> String {
    if path == "/private/tmp" {
        return "/tmp".to_string();
    }
    if let Some(rest) = path.strip_prefix("/private/tmp/") {
        return format!("/tmp/{rest}");
    }
    path.to_string()
}

fn trim_trailing_slashes(path: String) -> String {
    let trimmed = path.trim_end_matches('/');
    if trimmed.is_empty() && path.starts_with('/') {
        "/".to_string()
    } else {
        trimmed.to_string()
    }
}

pub(crate) fn normalize_path_for_identity(path: &PathText) -> String {
    trim_trailing_slashes(normalize_tmp_alias(&path.replace('\\', "/")))
}

pub(crate) fn normalize_relative_path(path: &RelativePathText) -> String {
    path.replace('\\', "/").trim_matches('/').to_string()
}

pub(crate) fn relative_path_key(path: &RelativePathText) -> String {
    normalize_relative_path(path).to_lowercase()
}

pub(crate) fn has_hidden_segment(path: &RelativePathText) -> bool {
    normalize_relative_path(path)
        .split('/')
        .any(|segment| segment.starts_with('.'))
}

/// Append a git-reported relative path, normalizing separators and skipping
/// hidden/empty paths. Deduplicates on the *exact* normalized path.
///
/// Deliberately case-sensitive: on a case-sensitive filesystem `Note.md` and
/// `note.md` are two different files, and a case-only rename makes git report
/// both (one deleted, one added). Collapsing them here kept only whichever git
/// listed first — often the deleted spelling — so the surviving file was never
/// re-parsed and vanished from the vault until a full rescan.
///
/// Case collisions are instead resolved by `prune_stale_entries`, which drops
/// entries whose file no longer exists *before* case-folding, so on a
/// case-insensitive filesystem the duplicate still collapses to one entry.
pub(crate) fn push_unique_relative_path(
    paths: &mut Vec<String>,
    path: impl AsRef<RelativePathText>,
) {
    let normalized = normalize_relative_path(path.as_ref());
    if normalized.is_empty() || has_hidden_segment(&normalized) {
        return;
    }
    if !paths.contains(&normalized) {
        paths.push(normalized);
    }
}

pub(crate) fn vault_relative_path_string(vault: &Path, file: &Path) -> Result<String, String> {
    let vault_path = normalize_path_for_identity(&vault.to_string_lossy());
    let file_path = normalize_path_for_identity(&file.to_string_lossy());
    if file_path == vault_path {
        return Ok(String::new());
    }

    let prefix = format!("{vault_path}/");
    file_path
        .strip_prefix(&prefix)
        .map(normalize_relative_path)
        .ok_or_else(|| {
            format!(
                "File {} is not inside vault {}",
                file.display(),
                vault.display()
            )
        })
}

pub(crate) fn vault_relative_markdown_stem(path: &Path, vault: &Path) -> String {
    let relative = vault_relative_path_string(vault, path)
        .unwrap_or_else(|_| normalize_path_for_identity(&path.to_string_lossy()));
    relative
        .strip_suffix(".md")
        .unwrap_or(&relative)
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_relative_path_string_normalizes_tmp_alias_and_backslashes() {
        assert_eq!(
            vault_relative_path_string(
                Path::new("/private/tmp/grover-vault"),
                Path::new("/tmp/grover-vault/projects\\active.md"),
            )
            .unwrap(),
            "projects/active.md"
        );
    }

    #[test]
    fn test_relative_path_key_is_case_insensitive_without_changing_output_path() {
        assert_eq!(
            relative_path_key("Projects\\Active.md"),
            "projects/active.md"
        );
    }

    #[test]
    fn test_push_unique_dedupes_only_identical_normalized_paths() {
        let mut paths = vec![];
        // Same path, different separators → one entry, original spelling kept.
        push_unique_relative_path(&mut paths, "Projects\\Active.md");
        push_unique_relative_path(&mut paths, "Projects/Active.md");
        assert_eq!(paths, vec!["Projects/Active.md"]);
    }

    #[test]
    fn test_push_unique_keeps_case_variants_as_distinct_files() {
        // A case-only rename makes git report both spellings. On a
        // case-sensitive filesystem these are different files, so both must
        // survive or the renamed note disappears until a full rescan.
        let mut paths = vec![];
        push_unique_relative_path(&mut paths, "Note.md");
        push_unique_relative_path(&mut paths, "note.md");
        assert_eq!(paths, vec!["Note.md", "note.md"]);
    }
}
