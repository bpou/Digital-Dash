#include <QCoreApplication>
#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QUrl>

#include "VehicleClient.h"

int main(int argc, char *argv[]) {
    QGuiApplication app(argc, argv);
    QGuiApplication::setApplicationName("Digital Dash Qt");
    QGuiApplication::setOrganizationName("DigitalDash");

    QUrl vehicleUrl(QStringLiteral("ws://127.0.0.1:8765"));
    QString initialView(QStringLiteral("cluster"));
    const QStringList args = QCoreApplication::arguments();
    for (int i = 1; i < args.size(); ++i) {
        if (args[i] == QStringLiteral("--ws") && i + 1 < args.size()) {
            vehicleUrl = QUrl(args[++i]);
        } else if (args[i] == QStringLiteral("--view") && i + 1 < args.size()) {
            const QString requestedView = args[++i].toLower();
            if (requestedView == QStringLiteral("cluster") || requestedView == QStringLiteral("center")) {
                initialView = requestedView;
            }
        }
    }

    VehicleClient vehicleClient;
    vehicleClient.connectTo(vehicleUrl);

    QQmlApplicationEngine engine;
    engine.rootContext()->setContextProperty("vehicleClient", &vehicleClient);
    engine.rootContext()->setContextProperty("initialView", initialView);
    engine.loadFromModule("DigitalDash", "Main");

    if (engine.rootObjects().isEmpty()) {
        return -1;
    }

    return app.exec();
}
