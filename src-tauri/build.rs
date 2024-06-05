fn main() {
    cynic_codegen::register_schema("sr-exam")
        .from_sdl_file("schemas/sr-exam.graphql")
        .unwrap()
        .as_default()
        .unwrap();
}