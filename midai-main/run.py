from app import create_app
from app.routes import init_app

app = create_app()
init_app(app)

if __name__ == "__main__":
    print("Template search path:", app.jinja_loader.searchpath)  # 打印模板搜索路径
    app.run(debug=True)
