"""User + Address schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AddressBase(BaseModel):
    label: str = Field(default="Nhà riêng", max_length=64)
    receiver: str = Field(max_length=255)
    phone: str = Field(max_length=32)
    street: str = Field(max_length=512)
    district: str = Field(max_length=128)
    city: str = Field(max_length=128)
    is_default: bool = False


class AddressCreate(AddressBase):
    pass


class AddressUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=64)
    receiver: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    street: str | None = Field(default=None, max_length=512)
    district: str | None = Field(default=None, max_length=128)
    city: str | None = Field(default=None, max_length=128)
    is_default: bool | None = None


class AddressResponse(AddressBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str
    phone: str
    role: str
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)


class UserAdminUpdate(BaseModel):
    is_active: bool | None = None
    role: str | None = Field(default=None, pattern="^(customer|admin)$")


class UserListItem(UserResponse):
    total_orders: int = 0
    total_spent: int = 0
