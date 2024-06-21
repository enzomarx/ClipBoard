import PyQt6.QtCore as QtCore
import PyQt6.QtGui as QtGui
import PyQt6.QtWidgets as QtWidgets
from PyQt6.QtWebEngine import QWebEngineView
import sys

class MainWindow(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()

        # Configurações gerais
        self.setWindowTitle("Gerenciador de Projetos")
        self.setFixedSize(800, 600)

        # Create widget /show HTML
        self.html_view = QWebEngineView()

        # Carregando o arquivo HTML
        with open('index.html', 'r') as f:
            html_content = f.read()
        self.html_view.setHtml(html_content)

        # Main layout 
        central_widget = QtWidgets.QWidget()
        layout = QtWidgets.QVBoxLayout(central_widget)

        # widget HTML--> layout
        layout.addWidget(self.html_view)

        # Def layout 
        self.setCentralWidget(central_widget)

if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
