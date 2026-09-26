# Smart Diff — path normalisation

Before a changed file is matched against any rule, its path is normalised:

- backslashes become forward slashes;
- a leading `./` or `/` is removed.

`matchesPattern(path, pattern)` then tests the normalised path against a
pattern taken from the repo settings. Classification rules themselves are not
part of this change.
