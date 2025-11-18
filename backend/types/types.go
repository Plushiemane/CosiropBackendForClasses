package types

type SerialResult struct {
    Result        string `json:"result"`
    Length        int    `json:"length"`
    SerialPort    string `json:"serial_port"`
    SerialWritten int    `json:"serial_written"`
    SerialReply   string `json:"serial_reply,omitempty"`
}

type SerialConfig struct {
    PortName    string `json:"port_name"`
    BaudRate    int    `json:"baud_rate"`
    DataBits    int    `json:"data_bits"`
    Parity      string `json:"parity"`      // "none", "even", "odd"
    StopBits    int    `json:"stop_bits"`   // 1 or 2
    FlowControl string `json:"flow_control"` // "none", "rts_cts", "xon_xoff"
}