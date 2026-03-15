import { Injectable, Logger } from '@nestjs/common';

export interface OcrPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
}

export interface OcrRawResult {
  fullText: string;
  pages: OcrPage[];
  rawResponse: Record<string, unknown>;
}

@Injectable()
export class OcrProviderService {
  private readonly logger = new Logger(OcrProviderService.name);
  private client: any = null;

  private async getClient() {
    if (this.client) return this.client;

    try {
      // @ts-ignore — optional dependency, falls back to mock if not installed
      const { ImageAnnotatorClient } = await import('@google-cloud/vision');

      const options: Record<string, unknown> = {};
      if (process.env.GOOGLE_CLOUD_KEY_FILE) {
        options.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
      }
      if (process.env.GOOGLE_CLOUD_CREDENTIALS_JSON) {
        options.credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON);
      }
      if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
        options.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      }

      this.client = new ImageAnnotatorClient(options as any);
      return this.client;
    } catch (error) {
      this.logger.warn(
        'Google Cloud Vision SDK not available. Falling back to mock extraction.',
      );
      return null;
    }
  }

  async extractText(filePath: string): Promise<OcrRawResult> {
    const client = await this.getClient();

    if (!client) {
      this.logger.warn('Using mock OCR extraction (no Google Vision client)');
      return this.mockExtraction(filePath);
    }

    try {
      const [result] = await client.documentTextDetection(filePath);
      const fullTextAnnotation = result.fullTextAnnotation;

      const fullText = fullTextAnnotation?.text || '';
      const pages: OcrPage[] = (fullTextAnnotation?.pages || []).map(
        (page: any, index: number) => ({
          pageNumber: index + 1,
          text: fullText,
          width: page.width || 0,
          height: page.height || 0,
        }),
      );

      this.logger.log(`OCR extraction completed: ${fullText.length} characters extracted`);

      return {
        fullText,
        pages,
        rawResponse: result as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.warn(`Google Vision API error, falling back to mock: ${error}`);
      return this.mockExtraction(filePath);
    }
  }

  private async mockExtraction(filePath: string): Promise<OcrRawResult> {
    const mockText = [
      'Công ty cổ phần Cảng dịch vụ dầu khí tổng hợp Phú Mỹ',
      'PTSC PhuMy Joint Stock Company',
      'PHIẾU GIAO NHẬN/ CÂN HÀNG',
      'TAU=>CONG',
      'Số phiếu: 222510080233',
      'Biển số: 72H05214',
      'Số Mooc: 72R02762',
      'Tàu: LAN NING 15',
      'Hàng hóa: UREA',
      'Vận đơn: LN15TJ250901/02',
      'Chủ hàng: PVFCCO (CTCP HCDK)',
      'Uỷ thác: THORESEN VINAMA',
      'Cân xe hàng: 36.020 (kg)',
      'Cân xe rỗng: 18.580 (kg)',
      'Trọng lượng hàng: 17.440 (kg)',
      'Hầm: H1',
      'P/Án: TAU=>CONG',
    ].join('\n');

    return {
      fullText: mockText,
      pages: [{ pageNumber: 1, text: mockText, width: 2480, height: 3508 }],
      rawResponse: {
        provider: 'mock',
        processedAt: new Date().toISOString(),
        filePath,
      },
    };
  }
}
