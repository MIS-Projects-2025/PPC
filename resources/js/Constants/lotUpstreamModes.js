const LOTID = "lot_id";
const PARTNAME = "partname";
const QTY = "qty";

export const LOT_UPSTREAM_MODES = {
	PREFIX_SLOT_MODE: "[SLOT]:",
	RECEIVE: "receive",
	RELEASE: "release",
	RECEIVING: "RECEIVING",
	RELEASING: "RELEASING",
	TYPE_COMMAND: "COMMAND",
	TYPE_FIELD_SELECT: "FIELD_SELECT",
	TYPE_FIELD_VALUE: "FIELD_VALUE",
	TYPE_SLOT: "SLOT",
	TYPE_LOT: "LOT",
	EDIT: "edit",
	RECEIVE_SUCCESS: "receive_success",
	RELEASE_SUCCESS: "release_success",
	SUCCESS: "success",
	WRONG: "wrong",
	OPEN: "open",
	CLOSE: "close",
	LOTID: LOTID,
	PARTNAME: PARTNAME,
	QTY: QTY,
	DONE: "DONE",
	CANCEL: "CANCEL",
	FIELD_ORDER: [LOTID, PARTNAME, QTY],
};
