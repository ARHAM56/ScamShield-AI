# ScamShield AI Architecture

## Overview
ScamShield AI is a multi-vector phishing detection system designed to protect users across web, mobile, and voice channels.

## Microservices
- **API Gateway**: Entry point for all client requests.
- **Voice Service**: Real-time audio processing and STT.
- **Risk Service**: Neural scoring and behavioral analysis.
- **GPT Service**: Deep semantic reasoning.
- **Detection Service**: URL and content analysis.

## Android Integration
The Android app connects via Bluetooth to the web dashboard for real-time monitoring of active calls.
