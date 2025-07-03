# VPN Detection App

## Overview

This application detects VPN, proxy, and suspicious connections by analyzing multiple signals including IP analysis, browser fingerprinting, WebRTC leaks, location mismatches, and bot detection.

## IP Analysis

The IP analysis is performed using multiple free services:

- ip-api.com
- ipify.org combined with ipapi.co
- ipgeolocation.io

Additionally, the app integrates scraping of [whatismyipaddress.com](https://whatismyipaddress.com) to enhance detection by:

- Checking if the IP is identified as a VPN server.
- Checking if the IP is listed on various blacklists.

### WhatIsMyIpAddress Scraping

The app fetches and parses the following pages for the user's IP:

- `https://whatismyipaddress.com/ip/{ip}`: Extracts VPN server detection information.
- `https://whatismyipaddress.com/blacklist-check/`: Extracts blacklist status from multiple blacklist sources.

This data is incorporated into the IP analysis results.

## Detection Calculation

The overall detection confidence score is calculated by combining weighted factors from:

- IP Analysis:
  - Datacenter IP (+30)
  - Hosting Provider IP (+25)
  - Tor Exit Node (+40)
  - VPN Server Detected via WhatIsMyIpAddress (+50)
  - Blacklisted IP via WhatIsMyIpAddress (+30)
  - Risk score from IP services (weighted by 0.3)
- WebRTC Leak (+35)
- Browser Fingerprint:
  - Timezone mismatch (+20)
  - Continent mismatch (+20)
  - Suspicion score (weighted by 0.4)
- Location Mismatch (+40)
- Bot/Automation Detection (+35)

The confidence score is capped at 100. A VPN/proxy detection is flagged if the confidence score is 50 or higher, or if any critical flags (WebRTC leak, location mismatch, bot detection, fingerprint mismatch) are true.

## Fallback Logic

If the IP timezone is missing or unknown, the app infers the timezone from the country code using a predefined mapping to improve timezone mismatch detection.

## Usage

Run the app and navigate to the VPN Detector page to see detailed detection results including confidence scores and risk factors.

## Notes

- The scraping of whatismyipaddress.com is subject to the site's terms of service and may be affected by site changes.
- API keys are not required for the integrated free IP analysis services.
- The detection engine logs results for further analysis and improvement.
