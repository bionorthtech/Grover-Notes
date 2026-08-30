pub(super) fn json_scalar_to_string(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(value) => Some(value.clone()),
        serde_json::Value::Number(value) => Some(value.to_string()),
        serde_json::Value::Bool(value) => Some(value.to_string()),
        _ => None,
    }
}

pub(super) fn json_scalar_array_to_strings(value: &serde_json::Value) -> Option<Vec<String>> {
    value
        .as_array()
        .map(|sequence| sequence.iter().filter_map(json_scalar_to_string).collect())
}

pub(super) fn yaml_value_to_string(value: &serde_yaml::Value) -> Option<String> {
    match value {
        serde_yaml::Value::String(value) => Some(value.clone()),
        serde_yaml::Value::Number(value) => Some(value.to_string()),
        serde_yaml::Value::Bool(value) => Some(value.to_string()),
        _ => None,
    }
}

pub(super) fn yaml_value_to_string_vec(value: &serde_yaml::Value) -> Option<Vec<String>> {
    value
        .as_sequence()
        .map(|sequence| sequence.iter().filter_map(yaml_value_to_string).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn json_scalars_convert_to_strings_and_reject_containers() {
        assert_eq!(json_scalar_to_string(&serde_json::json!("hi")), Some("hi".into()));
        assert_eq!(json_scalar_to_string(&serde_json::json!(42)), Some("42".into()));
        assert_eq!(json_scalar_to_string(&serde_json::json!(1.5)), Some("1.5".into()));
        assert_eq!(json_scalar_to_string(&serde_json::json!(true)), Some("true".into()));
        assert_eq!(json_scalar_to_string(&serde_json::json!(null)), None);
        assert_eq!(json_scalar_to_string(&serde_json::json!([1])), None);
        assert_eq!(json_scalar_to_string(&serde_json::json!({"a": 1})), None);
    }

    #[test]
    fn json_arrays_keep_scalars_and_drop_nested_containers() {
        let value = serde_json::json!(["a", 2, true, null, ["nested"], {"k": "v"}]);
        assert_eq!(
            json_scalar_array_to_strings(&value),
            Some(vec!["a".into(), "2".into(), "true".into()])
        );
        assert_eq!(json_scalar_array_to_strings(&serde_json::json!([])), Some(vec![]));
        // Not an array at all.
        assert_eq!(json_scalar_array_to_strings(&serde_json::json!("a")), None);
    }

    #[test]
    fn yaml_scalars_convert_to_strings_and_reject_containers() {
        assert_eq!(yaml_value_to_string(&serde_yaml::from_str("hi").unwrap()), Some("hi".into()));
        assert_eq!(yaml_value_to_string(&serde_yaml::from_str("42").unwrap()), Some("42".into()));
        assert_eq!(yaml_value_to_string(&serde_yaml::from_str("true").unwrap()), Some("true".into()));
        assert_eq!(yaml_value_to_string(&serde_yaml::Value::Null), None);
        let sequence: serde_yaml::Value = serde_yaml::from_str("- a").unwrap();
        assert_eq!(yaml_value_to_string(&sequence), None);
    }

    #[test]
    fn yaml_sequences_keep_scalars_and_drop_nested_containers() {
        let value: serde_yaml::Value = serde_yaml::from_str("- a\n- 2\n- true\n- [nested]\n").unwrap();
        assert_eq!(
            yaml_value_to_string_vec(&value),
            Some(vec!["a".into(), "2".into(), "true".into()])
        );
        // Not a sequence at all.
        assert_eq!(yaml_value_to_string_vec(&serde_yaml::from_str("plain").unwrap()), None);
    }
}
