from sqlalchemy import create_engine, MetaData
from eralchemy import render_er

# Corrected DB path with four slashes for absolute path
db_path = "sqlite:///jsapp/sqlite3.db"
engine = create_engine(db_path)
metadata = MetaData()
metadata.reflect(bind=engine)

# Create the ERD
render_er(metadata, "erd_diagram.png")