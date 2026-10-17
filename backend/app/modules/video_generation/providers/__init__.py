"""Factory chon adapter theo ProviderConfiguration.adapter."""
from __future__ import annotations

from app.database.models import ProviderConfiguration
from app.modules.video_generation.providers.base import VideoProvider
from app.modules.video_generation.providers.byteplus_seedance import BytePlusSeedanceAdapter
from app.modules.video_generation.providers.generic_compatible import GenericCompatibleAdapter
from app.modules.video_generation.providers.manual import ManualImportProvider

_ADAPTERS: dict[str, type[VideoProvider]] = {
    "byteplus_seedance": BytePlusSeedanceAdapter,
    "generic": GenericCompatibleAdapter,
    "manual": ManualImportProvider,
}


def get_provider(config: ProviderConfiguration) -> VideoProvider:
    """Tra adapter tuong ung; adapter la mac dinh la manual."""
    cls = _ADAPTERS.get((config.adapter or "").strip().lower(), ManualImportProvider)
    return cls(config)


__all__ = ["VideoProvider", "get_provider"]
