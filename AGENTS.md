## Rust 代码开发规范

**沟通语言**：使用中文进行对话和代码注释。

**代码质量要求**：每次代码修改后，必须按以下顺序完成所有检查：

1. **编译检查**：确保代码能够成功编译通过

   ```bash
   cargo build
   ```

2. **代码格式化**：使用 `cargo fmt` 自动格式化代码

   ```bash
   cargo fmt
   ```

3. **静态分析**：运行 `cargo clippy` 检查代码质量和潜在问题

   ```bash
   cargo clippy --all-targets -- -D warnings
   ```

4. **单元测试**：执行 `cargo test` 确保所有测试通过
   ```bash
   cargo test
   ```

**注意**：以上所有步骤都必须通过，不允许提交未通过检查的代码。