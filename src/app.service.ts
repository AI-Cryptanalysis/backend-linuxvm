import { Injectable } from '@nestjs/common';
// Removed unused import 'e' from 'express'
import os from 'os';
@Injectable()
export class AppService {
  getHealth(): string {
    const platform = os.platform();
    const release = os.release().toLowerCase();
    // Check for Windows
    if (platform === 'win32') {
      return 'Service is not compatible with Windows. Please use a supported Linux distribution.';
    }
    // Check for MacOS
    if (platform === 'darwin') {
      return 'Service is not compatible with MacOS. Please use a supported Linux distribution.';
    }
    // Check for Linux and specific distros
    if (platform === 'linux') {
      // Try to detect Kali or Parrot by release string
      if (release.includes('kali')) {
        return 'Service is healthy on Kali Linux!';
      }
      if (release.includes('parrot')) {
        return 'Service is healthy on Parrot OS!';
      }
      // Generic Linux
      return 'Service is running on Linux. Please verify all required packages and dependencies are installed.';
    }
    // Unknown/unsupported OS
    return 'Service is not compatible with this operating system. Please use a supported Linux distribution.';
  }
}
