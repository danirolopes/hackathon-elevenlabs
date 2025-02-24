from injector import Injector

from src.di import DiModule
from src.initializer import Initializer

if __name__ == "__main__":
    injector = Injector([DiModule])
    initializer = injector.get(Initializer)
    initializer.start()
