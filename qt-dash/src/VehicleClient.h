#pragma once

#include <QObject>
#include <QAbstractSocket>
#include <QJsonObject>
#include <QTimer>
#include <QUrl>
#include <QWebSocket>

class VehicleClient : public QObject {
    Q_OBJECT
    Q_PROPERTY(QJsonObject state READ state NOTIFY stateChanged)
    Q_PROPERTY(bool connected READ connected NOTIFY connectedChanged)

public:
    explicit VehicleClient(QObject *parent = nullptr);

    QJsonObject state() const;
    bool connected() const;

    Q_INVOKABLE void connectTo(const QUrl &url);
    Q_INVOKABLE void sendCommand(const QString &type, const QJsonObject &payload = {});

signals:
    void stateChanged();
    void connectedChanged();

private slots:
    void handleConnected();
    void handleDisconnected();
    void handleMessage(const QString &message);
    void reconnect();
    void advanceMock();

private:
    void setConnected(bool connected);
    void setState(const QJsonObject &state);
    void startMock();
    void stopMock();
    QJsonObject defaultState() const;

    QWebSocket m_socket;
    QTimer m_reconnectTimer;
    QTimer m_mockTimer;
    QUrl m_url;
    QJsonObject m_state;
    bool m_connected = false;
    double m_mockTick = 0.0;
};
