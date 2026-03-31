import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import os from 'os';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the correct health message based on OS', () => {
      // Use ES6 import and add type annotations
      const platform: NodeJS.Platform = os.platform();
      const release: string = os.release().toLowerCase();
      let expected: string;
      if (platform === 'win32') {
        expected =
          'Service is not compatible with Windows. Please use a supported Linux distribution.';
      } else if (platform === 'darwin') {
        expected =
          'Service is not compatible with MacOS. Please use a supported Linux distribution.';
      } else if (platform === 'linux') {
        if (release.includes('kali')) {
          expected = 'Service is healthy on Kali Linux!';
        } else if (release.includes('parrot')) {
          expected = 'Service is healthy on Parrot OS!';
        } else {
          expected =
            'Service is running on Linux. Please verify all required packages and dependencies are installed.';
        }
      } else {
        expected =
          'Service is not compatible with this operating system. Please use a supported Linux distribution.';
      }
      expect(appController.getHealth()).toBe(expected);
    });
  });
});
