---
name: code-review
description: Review code for quality, security, performance, and maintainability. Use when reviewing pull requests, examining code changes, or when the user asks for a code review.
---

# Code Review

When reviewing code, follow these guidelines:

## Review Checklist

1. **Correctness**: Verify logic, edge cases, and potential bugs
2. **Performance**: Identify unnecessary computations, memory leaks, or O(n²) patterns
3. **Security**: Check for injection vulnerabilities, exposed secrets, and unsafe operations
4. **Readability**: Assess naming, structure, and whether comments are appropriate
5. **Best Practices**: Ensure adherence to language/framework conventions

## Output Format

Organize findings by severity:
- **Critical**: Must fix before merge (bugs, security issues)
- **Warning**: Should fix (performance, maintainability)
- **Suggestion**: Nice to have (style, minor improvements)

For each item, provide the file path, line reference, description, and a suggested fix.
