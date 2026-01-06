import os
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
from app.graphql.schema import schema
from app.database import engine, init_db

# Create FastAPI app
app = FastAPI(
    title="Invoice Reconciliation - Python Backend",
    description="Deterministic reconciliation engine with GraphQL API",
    version="1.0.0",
)

# Create GraphQL app
graphql_app = GraphQLRouter(
    schema,
    graphiql=True,  # Enable GraphQL IDE
)

# Mount GraphQL endpoint
app.include_router(graphql_app, prefix="/graphql")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Invoice Reconciliation Python Backend",
        "graphql": "/graphql",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "python-reconciliation"}


if __name__ == "__main__":
    import uvicorn
    
    # Initialize database tables in development
    if os.getenv("PYTHON_ENV") == "development":
        init_db()
    
    port = int(os.getenv("PYTHON_PORT", 8001))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("PYTHON_ENV") == "development",
    )