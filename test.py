import serial
import time

ser = serial.Serial(0, baudrate=115200, timeout=0.1)
ser.open()

ser.setRTS(0)
time.sleep(0.1)
ser.setRTS(1)
time.sleep(2)

for i in range(3):
  ser.setRTS(0)
  time.sleep(0.25)
  ser.setRTS(1)
  time.sleep(0.25)
