import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import os from 'os';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', async () => {
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
    const res = await request(app.getHttpServer()).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe(expected);
  });

  afterEach(async () => {
    await app.close();
  });
});
