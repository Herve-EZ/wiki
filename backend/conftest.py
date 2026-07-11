"""Pytest bootstrap.

`pytest` runs on config.settings_test (sqlite + locmem cache + in-memory
channel layer — zero external services; see pyproject.toml). CI re-runs the
suite against the real PostgreSQL/Redis stack with `pytest --ds=config.settings`.
"""
