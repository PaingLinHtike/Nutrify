# 🍔 Nutrify

## Environment Configuration

The project uses the `TEST_NUTRIFY_ENV_VAR` environment variable to switch between **Test** and **Development/Production** modes.

---

## 🧪 Test Mode

Set the environment variable to `True`.

### Windows (Command Prompt)

```cmd
set TEST_NUTRIFY_ENV_VAR=True
```

### Verify the environment variable

```cmd
echo %TEST_NUTRIFY_ENV_VAR%
```

Expected output:

```text
True
```

### Verify in Python

```python
import os

print(os.getenv("TEST_NUTRIFY_ENV_VAR"))
```

Expected output:

```text
True
```

---

## 🚀 Development / Production Mode

Set the environment variable to `False`.

### Windows (Command Prompt)

```cmd
set TEST_NUTRIFY_ENV_VAR=False
```

### Verify the environment variable

```cmd
echo %TEST_NUTRIFY_ENV_VAR%
```

Expected output:

```text
False
```

### Verify in Python

```python
import os

print(os.getenv("TEST_NUTRIFY_ENV_VAR"))
```

Expected output:

```text
False
```

---

## 📌 Notes

* `TEST_NUTRIFY_ENV_VAR=True` → Uses **test** resources (e.g., test Google Cloud Storage bucket and test Google Sheet).
* `TEST_NUTRIFY_ENV_VAR=False` → Uses **development/production** resources.
* Environment variables set with the `set` command are **temporary** and only apply to the current Command Prompt session. They must be set again when you open a new terminal.
