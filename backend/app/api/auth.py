from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.models.models import User, UserRole
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token, DemoLoginRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
    user = User(
        email=user_in.email.lower(),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role or UserRole.CUSTOMER,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return Token(access_token=token, token_type="bearer", user=user)

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    clean_email = (login_in.email or "").strip().lower()
    clean_password = login_in.password or ""
    if not clean_email or not clean_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required.",
        )
    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(clean_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return Token(access_token=token, token_type="bearer", user=user)

@router.post("/demo-login", response_model=Token)
def demo_login(req: DemoLoginRequest, db: Session = Depends(get_db)):
    """
    1-Click Demo Login for Hackathon presentations.
    Allows instant access as Admin, Support Agent, or Customer.
    """
    role_email_map = {
        UserRole.ADMIN: "admin@novastore.com",
        UserRole.AGENT: "agent@novastore.com",
        UserRole.CUSTOMER: "sarah@example.com"
    }
    target_email = role_email_map.get(req.role, "admin@novastore.com")
    user = db.query(User).filter(User.email == target_email).first()

    # If user doesn't exist, auto-create
    if not user:
        full_names = {
            UserRole.ADMIN: "NovaStore Administrator",
            UserRole.AGENT: "Alex Morgan (Senior Agent)",
            UserRole.CUSTOMER: "Sarah Jenkins (Customer)"
        }
        user = User(
            email=target_email,
            hashed_password=hash_password("demo12345"),
            full_name=full_names.get(req.role, "Demo User"),
            role=req.role,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return Token(access_token=token, token_type="bearer", user=user)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
