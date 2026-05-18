#include "VehicleClient.h"

#include <QJsonDocument>
#include <QtMath>

VehicleClient::VehicleClient(QObject *parent)
    : QObject(parent),
      m_state(defaultState()) {
    m_reconnectTimer.setInterval(2000);
    m_reconnectTimer.setSingleShot(true);
    connect(&m_reconnectTimer, &QTimer::timeout, this, &VehicleClient::reconnect);

    m_mockTimer.setInterval(120);
    connect(&m_mockTimer, &QTimer::timeout, this, &VehicleClient::advanceMock);

    connect(&m_socket, &QWebSocket::connected, this, &VehicleClient::handleConnected);
    connect(&m_socket, &QWebSocket::disconnected, this, &VehicleClient::handleDisconnected);
    connect(&m_socket, &QWebSocket::textMessageReceived, this, &VehicleClient::handleMessage);

    startMock();
}

QJsonObject VehicleClient::state() const {
    return m_state;
}

bool VehicleClient::connected() const {
    return m_connected;
}

void VehicleClient::connectTo(const QUrl &url) {
    m_url = url;
    if (m_simulationOnly) {
        startMock();
        return;
    }
    reconnect();
}

void VehicleClient::sendCommand(const QString &type, const QJsonObject &payload) {
    if (m_socket.state() != QAbstractSocket::ConnectedState) {
        return;
    }

    QJsonObject message;
    message.insert(QStringLiteral("type"), type);
    message.insert(QStringLiteral("payload"), payload);
    m_socket.sendTextMessage(QString::fromUtf8(QJsonDocument(message).toJson(QJsonDocument::Compact)));
}

void VehicleClient::setSimulationOnly(bool simulationOnly) {
    if (m_simulationOnly == simulationOnly) {
        return;
    }

    m_simulationOnly = simulationOnly;
    if (m_simulationOnly) {
        m_reconnectTimer.stop();
        m_socket.close();
        setConnected(false);
        startMock();
    } else {
        reconnect();
    }
}

void VehicleClient::handleConnected() {
    stopMock();
    setConnected(true);
}

void VehicleClient::handleDisconnected() {
    setConnected(false);
    startMock();
    m_reconnectTimer.start();
}

void VehicleClient::handleMessage(const QString &message) {
    const QJsonDocument document = QJsonDocument::fromJson(message.toUtf8());
    if (!document.isObject()) {
        return;
    }

    const QJsonObject object = document.object();
    if (object.value(QStringLiteral("type")).toString() != QStringLiteral("state")) {
        return;
    }

    const QJsonObject payload = object.value(QStringLiteral("payload")).toObject();
    if (!payload.isEmpty()) {
        setState(payload);
    }
}

void VehicleClient::reconnect() {
    if (m_simulationOnly || !m_url.isValid() || m_socket.state() == QAbstractSocket::ConnectedState ||
        m_socket.state() == QAbstractSocket::ConnectingState) {
        return;
    }

    m_socket.open(m_url);
}

void VehicleClient::advanceMock() {
    m_mockTick += 0.03;
    QJsonObject next = m_state;

    QJsonObject engine = next.value(QStringLiteral("engine")).toObject();
    engine.insert(QStringLiteral("rpm"), 800 + ((qSin(m_mockTick) + 1) / 2) * 7200);
    next.insert(QStringLiteral("engine"), engine);

    QJsonObject vehicle = next.value(QStringLiteral("vehicle")).toObject();
    vehicle.insert(QStringLiteral("speedKmh"), ((qSin(m_mockTick * 0.7 + 1.2) + 1) / 2) * 180);
    next.insert(QStringLiteral("vehicle"), vehicle);

    setState(next);
}

void VehicleClient::setConnected(bool connected) {
    if (m_connected == connected) {
        return;
    }
    m_connected = connected;
    emit connectedChanged();
}

void VehicleClient::setState(const QJsonObject &state) {
    m_state = state;
    emit stateChanged();
}

void VehicleClient::startMock() {
    if (!m_mockTimer.isActive()) {
        m_mockTimer.start();
    }
}

void VehicleClient::stopMock() {
    if (m_mockTimer.isActive()) {
        m_mockTimer.stop();
    }
}

QJsonObject VehicleClient::defaultState() const {
    return QJsonObject{
        {QStringLiteral("turn"),
         QJsonObject{{QStringLiteral("mode"), QStringLiteral("off")},
                     {QStringLiteral("left"), false},
                     {QStringLiteral("right"), false}}},
        {QStringLiteral("engine"), QJsonObject{{QStringLiteral("rpm"), 1650}}},
        {QStringLiteral("vehicle"), QJsonObject{{QStringLiteral("speedKmh"), 54}}},
        {QStringLiteral("fuel"), QJsonObject{{QStringLiteral("percent"), 47}}},
        {QStringLiteral("temp"),
         QJsonObject{{QStringLiteral("oilC"), 82}, {QStringLiteral("coolantC"), 80}}},
        {QStringLiteral("electrical"), QJsonObject{{QStringLiteral("batteryV"), 14.4}}},
        {QStringLiteral("climate"),
         QJsonObject{{QStringLiteral("tempSetC"), 21},
                     {QStringLiteral("fan"), 2},
                     {QStringLiteral("ac"), true},
                     {QStringLiteral("recirc"), false},
                     {QStringLiteral("defrost"), false},
                     {QStringLiteral("auto"), true}}},
        {QStringLiteral("audio"),
         QJsonObject{{QStringLiteral("volume"), 38},
                     {QStringLiteral("muted"), false},
                     {QStringLiteral("source"), QStringLiteral("bt")},
                     {QStringLiteral("nowPlaying"),
                      QJsonObject{{QStringLiteral("title"), QStringLiteral("Midnight Lights")},
                                  {QStringLiteral("artist"), QStringLiteral("Eliora")},
                                  {QStringLiteral("album"), QStringLiteral("Signals")},
                                  {QStringLiteral("durationSec"), 256},
                                  {QStringLiteral("positionSec"), 114},
                                  {QStringLiteral("isPlaying"), true}}}}},
        {QStringLiteral("car"),
         QJsonObject{{QStringLiteral("lights"), false},
                     {QStringLiteral("hazards"), false},
                     {QStringLiteral("locked"), true}}},
        {QStringLiteral("ambient"),
         QJsonObject{{QStringLiteral("color"), QStringLiteral("#7EE3FF")},
                     {QStringLiteral("brightness"), 65}}},
    };
}
