import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { env } from '../../env';
import { RingCentralSendFaxResponse } from '../models/RingCentralSendFaxResponse';
import { v4 as uuidv4 } from 'uuid';

@Service()
export class RingCentralClient {

  constructor(@Logger(__filename) private logger: LoggerInterface) { }

  public async fetchFaxList(partnerId: number, accessToken: any): Promise<any> {
    this.logger.error(`getMessageList client ${partnerId}`);
    if (!accessToken) {
      this.logger.error(`Authorization Error`);
      throw new HttpError(StatusCodes.UNAUTHORIZED);
    }

    const response = await axios.get(`${env.serviceMesh.ringCentral.baseUrl}/message-store`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  }

  public async getFaxFile(partnerId: number, messageId: number, accessToken: any): Promise<any> {
    this.logger.info(`getFaxFile client`);

    if (!accessToken) {
      this.logger.error(`Authorization Error`);
      throw new HttpError(StatusCodes.UNAUTHORIZED);
    }
    const response = await axios.get(`${env.serviceMesh.ringCentral.baseUrl}/message-store/${messageId}/content/${messageId}?contentDisposition=Attachment`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      responseType: 'arraybuffer',
    });
    return response.data;
  }

  public async sendFax(files: any[], faxNumbers: string[], accessToken: string): Promise<RingCentralSendFaxResponse> {
    this.logger.info(`Sending fax file at faxNumbers: ${faxNumbers}`);

    if (!accessToken) {
      this.logger.error(`Authorization Error`);
      throw new HttpError(StatusCodes.UNAUTHORIZED);
    }

    try {
      const data = new FormData();
      data.append('to', faxNumbers);

      files.forEach(file => { // Add all the files with file names
        const fileName = uuidv4() + '.pdf';
        data.append('attachment', file, fileName);
      });

      const config = {
        method: 'post',
        url: `${env.serviceMesh.ringCentral.baseUrl}/fax`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...data.getHeaders(),
        },
        data,
      };

      const response = await axios(config as any);

      return response.data;
    } catch (err) {
      this.logger.error(`Unable to send fax via Ring Central: ${(err as AxiosError).response.data.message}`);
      throw new Error('Unable to send fax via Ring Central.');
    }

  }
}
