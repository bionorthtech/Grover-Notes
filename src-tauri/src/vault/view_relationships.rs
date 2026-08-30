use super::view_value_conversions::{yaml_value_to_string, yaml_value_to_string_vec};
use super::views::FilterOp;

pub(super) fn relationship_candidates(link: &str) -> Vec<String> {
    RelationshipLink::new(link).candidates()
}

pub(super) fn evaluate_relationship_op(
    op: &FilterOp,
    rels: &[String],
    value: &Option<serde_yaml::Value>,
) -> bool {
    let relationships = Relationships::new(rels);
    match op {
        FilterOp::Contains => {
            relationship_target(value).is_some_and(|target| relationships.contains(&target))
        }
        FilterOp::NotContains => {
            relationship_target(value).map_or(true, |target| !relationships.contains(&target))
        }
        FilterOp::AnyOf => relationships.matches_any(&relationship_values(value)),
        FilterOp::NoneOf => !relationships.matches_any(&relationship_values(value)),
        FilterOp::IsEmpty => relationships.is_empty(),
        FilterOp::IsNotEmpty => !relationships.is_empty(),
        FilterOp::Equals => relationship_target(value).map_or_else(
            || relationships.is_empty(),
            |target| relationships.equals(&target),
        ),
        FilterOp::NotEquals => relationship_target(value).map_or_else(
            || !relationships.is_empty(),
            |target| !relationships.equals(&target),
        ),
        _ => false,
    }
}

struct Relationships<'a> {
    values: &'a [String],
}

impl<'a> Relationships<'a> {
    fn new(values: &'a [String]) -> Self {
        Self { values }
    }

    fn is_empty(&self) -> bool {
        self.values.is_empty()
    }

    fn contains(&self, target: &RelationshipTarget) -> bool {
        self.values
            .iter()
            .any(|relationship| target.matches(RelationshipLink::new(relationship)))
    }

    fn matches_any(&self, targets: &RelationshipTargets) -> bool {
        self.values
            .iter()
            .any(|relationship| targets.matches(RelationshipLink::new(relationship)))
    }

    fn equals(&self, target: &RelationshipTarget) -> bool {
        self.values.len() == 1 && self.contains(target)
    }
}

struct RelationshipTarget {
    value: String,
}

impl RelationshipTarget {
    fn new(value: String) -> Self {
        Self { value }
    }

    fn matches(&self, relationship: RelationshipLink<'_>) -> bool {
        self.as_link().normalized_stem() == relationship.normalized_stem()
    }

    fn as_link(&self) -> RelationshipLink<'_> {
        RelationshipLink::new(&self.value)
    }
}

struct RelationshipTargets {
    values: Vec<RelationshipTarget>,
}

impl RelationshipTargets {
    fn new(values: Vec<RelationshipTarget>) -> Self {
        Self { values }
    }

    fn matches(&self, relationship: RelationshipLink<'_>) -> bool {
        let relationship_stem = relationship.normalized_stem();
        self.values
            .iter()
            .any(|value| value.as_link().normalized_stem() == relationship_stem)
    }
}

struct RelationshipLink<'a> {
    value: &'a str,
}

impl<'a> RelationshipLink<'a> {
    fn new(value: &'a str) -> Self {
        Self { value }
    }

    fn candidates(&self) -> Vec<String> {
        let trimmed = self.value.trim();
        match self.inner().split_once('|') {
            Some((stem, alias)) => vec![trimmed.to_string(), stem.to_string(), alias.to_string()],
            None => vec![trimmed.to_string(), self.inner().to_string()],
        }
    }

    fn normalized_stem(&self) -> String {
        self.stem().to_lowercase()
    }

    fn stem(&self) -> &str {
        match self.inner().split_once('|') {
            Some((stem, _)) => stem,
            None => self.inner(),
        }
    }

    fn inner(&self) -> &str {
        let trimmed = self.value.trim();
        trimmed
            .strip_prefix("[[")
            .unwrap_or(trimmed)
            .strip_suffix("]]")
            .unwrap_or(trimmed)
    }
}

fn relationship_target(value: &Option<serde_yaml::Value>) -> Option<RelationshipTarget> {
    value
        .as_ref()
        .and_then(yaml_value_to_string)
        .map(RelationshipTarget::new)
}

fn relationship_values(value: &Option<serde_yaml::Value>) -> RelationshipTargets {
    let values = value
        .as_ref()
        .and_then(yaml_value_to_string_vec)
        .unwrap_or_default()
        .into_iter()
        .map(RelationshipTarget::new)
        .collect();
    RelationshipTargets::new(values)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scalar(value: &str) -> Option<serde_yaml::Value> {
        Some(serde_yaml::Value::String(value.to_string()))
    }

    fn list(values: &[&str]) -> Option<serde_yaml::Value> {
        Some(serde_yaml::Value::Sequence(
            values
                .iter()
                .map(|value| serde_yaml::Value::String((*value).to_string()))
                .collect(),
        ))
    }

    fn rels(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_string()).collect()
    }

    #[test]
    fn candidates_cover_raw_stem_and_alias_forms() {
        assert_eq!(
            relationship_candidates("[[Some Note]]"),
            vec!["[[Some Note]]", "Some Note"]
        );
        assert_eq!(
            relationship_candidates("[[Some Note|Alias]]"),
            vec!["[[Some Note|Alias]]", "Some Note", "Alias"]
        );
        // Bare links (no brackets) still yield the raw + inner form.
        assert_eq!(relationship_candidates("  Plain  "), vec!["Plain", "Plain"]);
    }

    #[test]
    fn contains_matches_ignoring_brackets_alias_and_case() {
        let value = scalar("some note");
        assert!(evaluate_relationship_op(
            &FilterOp::Contains,
            &rels(&["[[Some Note]]"]),
            &value
        ));
        assert!(evaluate_relationship_op(
            &FilterOp::Contains,
            &rels(&["[[Some Note|Alias]]"]),
            &value
        ));
        assert!(!evaluate_relationship_op(
            &FilterOp::Contains,
            &rels(&["[[Other]]"]),
            &value
        ));
        // A missing filter value can never be contained.
        assert!(!evaluate_relationship_op(
            &FilterOp::Contains,
            &rels(&["[[Some Note]]"]),
            &None
        ));
    }

    #[test]
    fn not_contains_is_the_inverse_and_defaults_true_without_a_value() {
        let value = scalar("Some Note");
        assert!(!evaluate_relationship_op(
            &FilterOp::NotContains,
            &rels(&["[[Some Note]]"]),
            &value
        ));
        assert!(evaluate_relationship_op(
            &FilterOp::NotContains,
            &rels(&["[[Other]]"]),
            &value
        ));
        assert!(evaluate_relationship_op(
            &FilterOp::NotContains,
            &rels(&["[[Some Note]]"]),
            &None
        ));
    }

    #[test]
    fn any_of_and_none_of_match_across_a_list() {
        let targets = list(&["Alpha", "Beta"]);
        assert!(evaluate_relationship_op(
            &FilterOp::AnyOf,
            &rels(&["[[Beta]]"]),
            &targets
        ));
        assert!(!evaluate_relationship_op(
            &FilterOp::AnyOf,
            &rels(&["[[Gamma]]"]),
            &targets
        ));
        assert!(!evaluate_relationship_op(
            &FilterOp::NoneOf,
            &rels(&["[[Beta]]"]),
            &targets
        ));
        assert!(evaluate_relationship_op(
            &FilterOp::NoneOf,
            &rels(&["[[Gamma]]"]),
            &targets
        ));
        // No relationships at all matches nothing, so NoneOf holds.
        assert!(evaluate_relationship_op(&FilterOp::NoneOf, &[], &targets));
    }

    #[test]
    fn emptiness_ops_ignore_the_filter_value() {
        assert!(evaluate_relationship_op(&FilterOp::IsEmpty, &[], &None));
        assert!(!evaluate_relationship_op(
            &FilterOp::IsEmpty,
            &rels(&["[[A]]"]),
            &None
        ));
        assert!(evaluate_relationship_op(
            &FilterOp::IsNotEmpty,
            &rels(&["[[A]]"]),
            &None
        ));
        assert!(!evaluate_relationship_op(&FilterOp::IsNotEmpty, &[], &None));
    }

    #[test]
    fn equals_requires_exactly_one_matching_relationship() {
        let value = scalar("Alpha");
        assert!(evaluate_relationship_op(
            &FilterOp::Equals,
            &rels(&["[[Alpha]]"]),
            &value
        ));
        // Two relationships is not "equals", even when one matches.
        assert!(!evaluate_relationship_op(
            &FilterOp::Equals,
            &rels(&["[[Alpha]]", "[[Beta]]"]),
            &value
        ));
        // Equals with no filter value means "has no relationships".
        assert!(evaluate_relationship_op(&FilterOp::Equals, &[], &None));
        assert!(!evaluate_relationship_op(
            &FilterOp::Equals,
            &rels(&["[[Alpha]]"]),
            &None
        ));
    }

    #[test]
    fn not_equals_inverts_equals() {
        let value = scalar("Alpha");
        assert!(!evaluate_relationship_op(
            &FilterOp::NotEquals,
            &rels(&["[[Alpha]]"]),
            &value
        ));
        assert!(evaluate_relationship_op(
            &FilterOp::NotEquals,
            &rels(&["[[Alpha]]", "[[Beta]]"]),
            &value
        ));
        assert!(evaluate_relationship_op(
            &FilterOp::NotEquals,
            &rels(&["[[Alpha]]"]),
            &None
        ));
        assert!(!evaluate_relationship_op(&FilterOp::NotEquals, &[], &None));
    }

    #[test]
    fn unsupported_ops_never_match() {
        assert!(!evaluate_relationship_op(
            &FilterOp::Before,
            &rels(&["[[A]]"]),
            &scalar("A")
        ));
        assert!(!evaluate_relationship_op(
            &FilterOp::After,
            &rels(&["[[A]]"]),
            &scalar("A")
        ));
    }
}
