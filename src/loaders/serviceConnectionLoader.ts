import { MicroframeworkLoader, MicroframeworkSettings } from 'microframework-w3tec';
import { adminService, connection, consumerService, producerService } from 'service-connector';
import { Logger } from '../lib/logger/Logger';

export const serviceConnectionLoader: MicroframeworkLoader = async (settings: MicroframeworkSettings | undefined) => {
    const logger: Logger = new Logger(__filename);
    connection.init();
    await adminService.createConsumerGroup();
    await adminService.createTopics();
    await producerService.init();
    logger.info(`producer is initiated `);
    await consumerService.init();
    await consumerService.initListening();
    consumerService.consumerEventEmitter.on(consumerService.CONSUMER_DATA_EVENT, (data: any) => {
        switch (data.topic) {
            default:
                console.warn('No topic handler found');
                break;
        }
    });
    logger.info(`consumer is initiated`);
};
