import { Builder } from 'builder-pattern';
import { Service } from 'typedi';
import { FaxOutboundDetailEntity } from '../entities/FaxOutbondDetailEntity';
import { ProcessingStatus } from '../models/FaxDetails';
import { FaxOutboundForNoShow, FaxSendData } from '../models/FaxOutbound';
import { FaxTemplateDataForNoShow } from '../models/FaxTemplateData';

@Service()
export class FaxOutboundMapper {
    public toAppointmentNoShowDto(faxOutBound: FaxOutboundForNoShow): FaxTemplateDataForNoShow {
        return Builder(FaxTemplateDataForNoShow)
            .referral_sent_date(faxOutBound.referralSentDate)
            .appointment_booked_date(faxOutBound.appointmentBookedDate)
            .book_date(faxOutBound.appointmentBookedDate)
            .book_address(faxOutBound.appointmentDetail.clinicAddress)
            .book_time(faxOutBound.bookTime)
            .pat_fname(faxOutBound.patientDetail.firstName)
            .pat_lname(faxOutBound.patientDetail.lastName)
            .fax_number(faxOutBound.appointmentDetail.providerFaxNo)
            .address(faxOutBound.appointmentDetail.clinicAddress)
            .providerId(faxOutBound.appointmentDetail.providerNpi)
            .no_show_date(faxOutBound.patientNoShowDate)
            .clinic_name('Akumin')
            .pat_dob(faxOutBound.patientDetail.dob)
            .pat_hcn(faxOutBound.patientDetail.hcnVersion)
            .build();
    }

    public toFaxOutboundDetailEntity(faxData: FaxSendData, partnerId: number): FaxOutboundDetailEntity {
        return Builder(FaxOutboundDetailEntity)
            .appointmentId(faxData.appointmentId)
            .patientId(faxData.patientId)
            .referralId(faxData.referralId)
            .partnerId(partnerId)
            .createdAt(new Date())
            .faxSendStatus(ProcessingStatus.PROCESSING)
            .faxTemplateType(faxData.faxTemplateType)
            .recipientFaxNumber(faxData.recipientFaxNumber)
            .build();
    }
}
