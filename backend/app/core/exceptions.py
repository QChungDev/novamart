"""Application exceptions -> consistent HTTP error responses."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code: int = 500
    code: str = "internal_error"
    message: str = "Đã có lỗi xảy ra."

    def __init__(self, message: str | None = None, code: str | None = None):
        super().__init__(message or self.message)
        if message:
            self.message = message
        if code:
            self.code = code


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"
    message = "Không tìm thấy dữ liệu."


class ConflictError(AppError):
    status_code = 409
    code = "conflict"
    message = "Dữ liệu đã tồn tại."


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"
    message = "Dữ liệu không hợp lệ."


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"
    message = "Chưa đăng nhập hoặc phiên đã hết hạn."


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"
    message = "Bạn không có quyền thực hiện thao tác này."


class InsufficientStockError(AppError):
    status_code = 409
    code = "insufficient_stock"
    message = "Sản phẩm không đủ hàng."


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
