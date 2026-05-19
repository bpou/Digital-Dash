import QtQuick

Rectangle {
    id: root
    property string label: ""
    property string value: ""
    property string suffix: ""
    property color accentColor: "#f4f7fb"

    width: 300
    height: 54
    radius: 6
    color: "#0d1014"
    border.color: "#202832"
    border.width: 1

    Text {
        anchors.left: parent.left
        anchors.leftMargin: 16
        anchors.verticalCenter: parent.verticalCenter
        text: root.label
        color: "#7b8591"
        font.family: "sans-serif"
        font.pixelSize: 14
        font.weight: Font.Medium
    }

    Text {
        anchors.right: parent.right
        anchors.rightMargin: 16
        anchors.verticalCenter: parent.verticalCenter
        text: root.suffix.length > 0 ? root.value + " " + root.suffix : root.value
        color: root.accentColor
        font.family: "sans-serif"
        font.pixelSize: 22
        font.weight: Font.DemiBold
    }
}
