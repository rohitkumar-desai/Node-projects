import * as dotenv from 'dotenv';
import * as path from 'path';

import * as pkg from '../package.json';
import {
    getOsEnv, getOsEnvOptional, getOsPath, getOsPaths, normalizePort, toBool, toNumber
} from './lib/env';

/**
 * Load .env file or for tests the .env.test file.
 */
dotenv.config({ path: path.join(process.cwd(), `.env${((process.env.NODE_ENV === 'test') ? '.test' : '')}`) });

/**
 * Environment variables
 */
export const env = {
    node: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    isDevelopment: process.env.NODE_ENV === 'development',
    app: {
        name: getOsEnv('APP_NAME'),
        version: (pkg as any).version,
        description: (pkg as any).description,
        host: getOsEnv('APP_HOST'),
        schema: getOsEnv('APP_SCHEMA'),
        routePrefix: getOsEnv('APP_ROUTE_PREFIX'),
        port: normalizePort(process.env.PORT || getOsEnv('APP_PORT')),
        banner: toBool(getOsEnv('APP_BANNER')),
        dirs: {
            migrations: getOsPaths('TYPEORM_MIGRATIONS'),
            migrationsDir: getOsPath('TYPEORM_MIGRATIONS_DIR'),
            entities: getOsPaths('TYPEORM_ENTITIES'),
            entitiesDir: getOsPath('TYPEORM_ENTITIES_DIR'),
            controllers: getOsPaths('CONTROLLERS'),
            middlewares: getOsPaths('MIDDLEWARES'),
            interceptors: getOsPaths('INTERCEPTORS'),
            subscribers: getOsPaths('SUBSCRIBERS'),
            resolvers: getOsPaths('RESOLVERS'),
        },
    },
    log: {
        level: getOsEnv('LOG_LEVEL'),
        json: toBool(getOsEnvOptional('LOG_JSON')),
        output: getOsEnv('LOG_OUTPUT'),
    },
    db: {
        type: getOsEnv('TYPEORM_CONNECTION'),
        host: getOsEnvOptional('TYPEORM_HOST'),
        port: toNumber(getOsEnvOptional('TYPEORM_PORT')),
        username: getOsEnvOptional('TYPEORM_USERNAME'),
        password: getOsEnvOptional('TYPEORM_PASSWORD'),
        database: getOsEnv('TYPEORM_DATABASE'),
        synchronize: toBool(getOsEnvOptional('TYPEORM_SYNCHRONIZE')),
        logging: getOsEnv('TYPEORM_LOGGING'),
    },
    swagger: {
        enabled: toBool(getOsEnv('SWAGGER_ENABLED')),
        route: getOsEnv('SWAGGER_ROUTE'),
    },
    monitor: {
        enabled: toBool(getOsEnv('MONITOR_ENABLED')),
        route: getOsEnv('MONITOR_ROUTE'),
        username: getOsEnv('MONITOR_USERNAME'),
        password: getOsEnv('MONITOR_PASSWORD'),
    },
    redisConfig: {
        url: getOsEnv('REDIS_URL'),
        port: toNumber(getOsEnv('REDIS_PORT')),
        password: getOsEnv('REDIS_PASSWORD'),
        sentinelPassword: getOsEnv('REDIS_SENTINEL_PASSWORD'),
    },
    firebaseConfig: {
        projectId: getOsEnv('PROJECT_ID'),
        clientEmail: getOsEnv('CLIENT_EMAIL'),
    },
    serviceMesh: {
        partner: {
            baseUrl: getOsEnv('PARTNER_SERVICE_URL'),
            clientName: getOsEnv('PARTNER_CLIENT_NAME'),
            clientSecret: getOsEnv('PARTNER_CLIENT_SECRET'),
        },
        apiKey: getOsEnv('API_KEY'),
        provider: {
            baseUrl: getOsEnv('PROVIDER_SERVICE_URL'),
        },
        inbox: {
            baseUrl: getOsEnv('INBOX_SERVICE_URL'),
        },
        referral: {
            baseUrl: getOsEnv('REFERRAL_SERVICE_URL'),
        },
        fileProcesing: {
            baseUrl: getOsEnv('FILE_PROCESSING_SERVICE_URL'),
        },
        srconfig: {
            baseUrl: getOsEnv('SRCONFIG_SERVICE_URL'),
        },
        ringCentral: {
            baseUrl: getOsEnv('RINGCENTRAL_GET_MESSAGES'),
            accessToken: getOsEnv('RINGCENTRAL_ACCESS_TOKEN_URL'),
        },
        docAIService: {
            clinical_report: getOsEnv('DOCAI_CLINICAL_REPORT_URL'),
        },
        documentService: {
            baseUrl: getOsEnv('DOCUMENT_SERVICE_URL'),
        },
        npiDirectory: {
            baseUrl: getOsEnv('NPI_DIRECTORY_URL'),
            apiKey: getOsEnv('NPI_DIRECTORY_API_KEY'),
        },
        uniteFaxConfig: {
            baseUrl: getOsEnv('UNITE_FAX_URL'),
            getPdf: getOsEnv('UNITE_PDF_FILE_URL'),
            faxFetchLimit: getOsEnv('UNITE_FAX_FETCH_LIMIT'),

        },
        appointmentService: {
            baseUrl: getOsEnv('APPOINTMENT_SERVICE_URL'),
        },
    },
    storageBucketConfig: {
        bucketName: getOsEnv('BUCKET_NAME'),
        pdfDir: getOsEnv('PDF_DIRECTORY'),
        pdfImageDir: getOsEnv('PDF_IMAGE_DIRECTORY'),
        storageBaseUrl: getOsEnv('STORAGE_BASE_URL'),
        faxReportTemplatePath: getOsEnv('FAX_REPORT_TEMPLATE_PATH'),
        faxNoShowTemplatePath: getOsEnv('FAX_NO_SHOW_TEMPLATE_PATH'),
        googleBucketUrl: getOsEnv('GOOGLE_BUCKET_URL'),
        referralDeclineFaxTemplateFile: getOsEnv('REFERRAL_DECLINED_FAX_TEMPLATE_FILE'),
        missingItemFaxTemplateFile: getOsEnv('MISSING_ITEM_FAX_TEMPLATE_FILE'),
        referralReceivedFaxTemplateFile:getOsEnv('REFERRAL_RECEIVED_FAX_TEMPLATE_FILE'),
        faxTemplateFolderPath: getOsEnv('FAX_TEMPLATE_FOLDER_PATH'),
    },
    kafkaConfig: {
        topic: getOsEnv('KAFKA_SUBSCRIBE_TOPICS'),
        reportSentNotification: getOsEnv('REPORT_SENT_NOTIFICATION'),
    },
    srFaxConfig: {
        number: getOsEnv('SRFAX_CONFIG_NUMBER'),
        email: getOsEnv('SRFAX_CONFIG_EMAIL'),
        password: getOsEnv('SRFAX_CONFIG_PASSWORD'),
        accountNumber: getOsEnv('SRFAX_CONFIG_ACCOUNT_NUMBER'),
    },
    cronSync: {
        daySyncStartTime: getOsEnv('CRON_DAY_SYNC_START_TIME'),
        daySyncEndTime: getOsEnv('CRON_DAY_SYNC_END_TIME'),
    },
    ringCentralIntegration: getOsEnvOptional('RING_CENTRAL_INTEGRATION_TOGGLE'),
};
