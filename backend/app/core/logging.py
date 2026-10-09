"""Structured logging. Never log passwords, tokens or secrets."""

import logging
import sys

from app.core.config import settings


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("novamart")
    if logger.handlers:
        return logger
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
    )
    logger.addHandler(handler)
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    logger.propagate = False
    return logger


logger = setup_logging()
