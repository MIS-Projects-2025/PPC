<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string|null $modified_at
 * @property string|null $modified_by
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySize newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySize newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySize query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySize whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySize whereModifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySize whereModifiedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySize whereName($value)
 */
	class BodySize extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $body_size_id
 * @property numeric|null $capacity
 * @property string|null $factory
 * @property string $effective_from
 * @property string|null $effective_to
 * @property int|null $machine_id
 * @property int|null $body_size_capacity_profile_instance_id
 * @property-read \App\Models\BodySize $bodySize
 * @property-read \App\Models\Machine|null $machine
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile whereBodySizeCapacityProfileInstanceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile whereBodySizeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile whereCapacity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile whereEffectiveFrom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile whereEffectiveTo($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile whereFactory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BodySizeCapacityProfile whereMachineId($value)
 */
	class BodySizeCapacityProfile extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $platform
 * @property int $qty_min
 * @property int|null $qty_max
 * @property int $capacity_uph
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CapacityBand newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CapacityBand newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CapacityBand query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CapacityBand whereCapacityUph($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CapacityBand whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CapacityBand whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CapacityBand wherePlatform($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CapacityBand whereQtyMax($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CapacityBand whereQtyMin($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CapacityBand whereUpdatedAt($value)
 */
	class CapacityBand extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $customer_data_id
 * @property string|null $Plant
 * @property string|null $Part_Name
 * @property int|null $Lead_Count
 * @property string|null $Package_Name
 * @property string|null $Lot_Id
 * @property string|null $Station
 * @property int|null $Qty
 * @property string|null $Lot_Type
 * @property string|null $Prod_Area
 * @property string|null $Lot_Status
 * @property string|null $Date_Loaded
 * @property string|null $Start_Time
 * @property string|null $Part_Type
 * @property string|null $Part_Class
 * @property string|null $Date_Code
 * @property string|null $Focus_Group
 * @property string|null $Process_Group
 * @property string|null $Bulk
 * @property string|null $Reqd_Time
 * @property string|null $Lot_Entry_Time
 * @property string|null $Stage
 * @property string|null $Stage_Start_Time
 * @property string|null $CCD
 * @property int|null $Stage_Run_Days
 * @property int|null $Lot_Entry_Time_Days
 * @property string|null $Tray
 * @property int|null $Backend_Leadtime
 * @property int|null $OSL_Days
 * @property string|null $BE_Group
 * @property string|null $Strategy_Code
 * @property string|null $CR3
 * @property string|null $BE_Starttime
 * @property int|null $BE_OSL_Days
 * @property string|null $Body_Size
 * @property string|null $Auto_Part
 * @property string|null $Ramp_Time
 * @property string|null $End_Customer
 * @property string|null $Bake
 * @property int|null $Bake_Count
 * @property string|null $Test_Lot_Id
 * @property string|null $Stock_Position
 * @property string|null $Assy_Site
 * @property string|null $Bake_Time_Temp
 * @property string|null $imported_by
 * @property int|null $f2_focus_group_flag
 * @property int|null $f1_focus_group_flag
 * @property string|null $import_date
 * @property string|null $canonical_body_size
 * @property string|null $production_line
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip bakeReady()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip cr3Res()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip excludingPostTnr()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip forDate(array|string $date)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip postTnrStations()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip sortByCtDesc()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip sortByLotEntryDaysDesc()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip tapeReelStations()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereAssySite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereAutoPart($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereBEGroup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereBEOSLDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereBEStarttime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereBackendLeadtime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereBake($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereBakeCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereBakeTimeTemp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereBodySize($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereBulk($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereCCD($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereCR3($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereCanonicalBodySize($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereCustomerDataId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereDateCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereDateLoaded($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereEndCustomer($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereF1FocusGroupFlag($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereF2FocusGroupFlag($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereFocusGroup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereImportDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereImportedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereLeadCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereLotEntryTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereLotEntryTimeDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereLotStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereLotType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereOSLDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip wherePackageName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip wherePartClass($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip wherePartName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip wherePartType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip wherePlant($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereProcessGroup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereProdArea($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereProductionLine($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereQty($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereRampTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereReqdTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereStage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereStageRunDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereStageStartTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereStartTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereStation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereStockPosition($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereStrategyCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereTestLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip whereTray($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CustomerDataWip withCt()
 */
	class CustomerDataWip extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $EMPID
 * @property int $EMPLOYID
 * @property string|null $EMPNAME
 * @property string|null $EMPPOSITION 0-ADMINISTRATOR\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n1-RANK AND FILE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n2-SUPERVISOR\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n3-SECTION HEAD\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n4-MANAGER\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n5-DIRECTOR\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n6-PRESIDENT
 * @property string|null $JOB_TITLE
 * @property string|null $COMPANY
 * @property string|null $DEPARTMENT
 * @property string|null $PRODLINE
 * @property string|null $STATION
 * @property string|null $Factory
 * @property string|null $TEAM
 * @property string|null $EMPSTATUS 0-PROBATIONARY\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n1-REGULAR\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n2-CONTRACTUAL\n3-TRAINEE DTS\n4-PROJECT BASED
 * @property string|null $EMPCLASS 1-DIRECT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n2-NON-EXEMPT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n3-EXEMPT\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n4-SECTION HEAD\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n5-MANAGER\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n6-SENIOR MANAGEMENT\n7-OJT
 * @property string|null $SHIFTTYPE 1-NORMAL\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\n2-SHIFTING
 * @property string|null $EMPSEX 1-MALE\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\n2-FEMALE
 * @property string|null $BIRTHDAY
 * @property string|null $DATEHIRED
 * @property string|null $DATEREG
 * @property string|null $EMAIL
 * @property string|null $USERNAME
 * @property string|null $PASSWRD
 * @property string|null $ACCSTATUS 1-ACTIVE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n2-INACTIVE
 * @property string|null $APPROVER1
 * @property string|null $APPROVER1_1
 * @property string|null $APPROVER2
 * @property string|null $APPROVER2_1
 * @property string|null $APPROVER2_2
 * @property string|null $APPROVER3
 * @property float $SICKLEAVE
 * @property float $VACATIONLEAVE
 * @property float $BIRTHDAYLEAVE
 * @property float $BEREAVEMENTLEAVE
 * @property float $MATERNITYLEAVE
 * @property float $PATERNITYLEAVE
 * @property float $EMERGENCYLEAVE
 * @property float $VAWC
 * @property float $SLW
 * @property float $SPL
 * @property float|null $MILITARY
 * @property float|null $SIL
 * @property float|null $SLINCR
 * @property float|null $VLINCR
 * @property string|null $DATEMONTHLYINCR
 * @property string|null $VLYEARLYINCR
 * @property string|null $VLSLRESETDATE
 * @property float|null $VLEXCESS
 * @property float|null $CONVERTCASH
 * @property string|null $LASTNAME
 * @property string|null $FIRSTNAME
 * @property string|null $MIDDLENAME
 * @property string|null $MIDDLE_INITIAL
 * @property string|null $ADDRESS
 * @property string|null $HOUSE_NO
 * @property string|null $BRGY
 * @property string|null $CITY
 * @property string|null $PROVINCE
 * @property string|null $PERMA_ADDRESS
 * @property string|null $PERMA_HOUSE_NO
 * @property string|null $PERMA_CITY
 * @property string|null $PERMA_BRGY
 * @property string|null $PERMA_PROVINCE
 * @property string|null $CONTACT_NO
 * @property string|null $CIVIL_STATUS
 * @property string|null $TIN_NO
 * @property string|null $SSS_NO
 * @property string|null $PHILHEALTH_NO
 * @property string|null $PAG_IBIG_NO
 * @property string|null $BANK_ACCT_NO
 * @property string|null $EDUC_ATTAINMENT
 * @property string|null $DATE_SEPARATION
 * @property string|null $CLEARANCE_UPDATE
 * @property int|null $AGE
 * @property string|null $NICKNAME
 * @property string|null $CONTACT_PERSON
 * @property string|null $RELATION_TO_CONTACT_PERSON
 * @property string|null $ADDRESS_OF_CONTACT_PERSON
 * @property string|null $CONTACT_NO_OF_CONTACT_PERSON
 * @property string|null $SHUTTLE
 * @property string|null $SERVICE_LENGTH
 * @property string|null $REPORT_TO
 * @property string|null $AREA
 * @property string|null $SEPARATION_REASON
 * @property string|null $SG_CATEGORY
 * @property string|null $EDUC_LEVEL
 * @property string|null $SG_DESIGNATION
 * @property string|null $RATE_CODE
 * @property string|null $EMPLEVEL
 * @property string|null $BENEFIT_LEVEL
 * @property string|null $HMO_LEVEL
 * @property string|null $GROUP_LIFE_INSURANCE_CLASS
 * @property string|null $PRINCIPAL_HMO_CERT_NO
 * @property string|null $CERTIFICATION_STATUS
 * @property string|null $FATHERS_NAME
 * @property string|null $FATHERS_BDAY
 * @property int|null $FATHERS_AGE
 * @property string|null $FATHERS_HMO_CERT_NO
 * @property string|null $MOTHERS_NAME
 * @property string|null $MOTHERS_BDAY
 * @property int|null $MOTHERS_AGE
 * @property string|null $MOTHERS_HMO_CERT_NO
 * @property string|null $SPOUSE_NAME
 * @property string|null $DATE_OF_MARRIAGE
 * @property string|null $SPOUSE_BDAY
 * @property int|null $SPOUSE_AGE
 * @property string|null $SPOUSE_HMO_CERT_NO
 * @property string|null $CHILDREN1_NAME
 * @property string|null $CHILDREN1_BDAY
 * @property int|null $CHILDREN1_AGE
 * @property string|null $CHILDREN1_HMO_CERT_NO
 * @property string|null $CHILDREN2_NAME
 * @property string|null $CHILDREN2_BDAY
 * @property int|null $CHILDREN2_AGE
 * @property string|null $CHILDREN2_HMO_CERT_NO
 * @property string|null $CHILDREN3_NAME
 * @property string|null $CHILDREN3_BDAY
 * @property int|null $CHILDREN3_AGE
 * @property string|null $CHILDREN3_HMO_CERT_NO
 * @property string|null $TRAININGS_SEMINARS1
 * @property string|null $TRAININGS_SEMINARS2
 * @property string|null $MONTH_YEAR_ATTENDED1
 * @property string|null $MONTH_YEAR_ATTENDED2
 * @property string|null $EMPLOYER
 * @property string|null $AGENCY_CO
 * @property string|null $INSURANCE_AMOUNT
 * @property string|null $DD_LIMIT
 * @property string|null $RMBRD_RMTYPE
 * @property numeric $pa_level
 * @property string|null $date_created
 * @property string|null $BIOMETRIC_STATUS
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereACCSTATUS($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereADDRESS($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereADDRESSOFCONTACTPERSON($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereAGE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereAGENCYCO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereAPPROVER1($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereAPPROVER11($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereAPPROVER2($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereAPPROVER21($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereAPPROVER22($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereAPPROVER3($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereAREA($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereBANKACCTNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereBENEFITLEVEL($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereBEREAVEMENTLEAVE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereBIOMETRICSTATUS($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereBIRTHDAY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereBIRTHDAYLEAVE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereBRGY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCERTIFICATIONSTATUS($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN1AGE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN1BDAY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN1HMOCERTNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN1NAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN2AGE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN2BDAY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN2HMOCERTNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN2NAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN3AGE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN3BDAY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN3HMOCERTNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCHILDREN3NAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCITY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCIVILSTATUS($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCLEARANCEUPDATE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCOMPANY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCONTACTNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCONTACTNOOFCONTACTPERSON($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCONTACTPERSON($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCONVERTCASH($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereDATEHIRED($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereDATEMONTHLYINCR($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereDATEOFMARRIAGE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereDATEREG($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereDATESEPARATION($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereDDLIMIT($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereDEPARTMENT($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereDateCreated($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEDUCATTAINMENT($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEDUCLEVEL($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMAIL($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMERGENCYLEAVE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMPCLASS($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMPID($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMPLEVEL($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMPLOYER($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMPLOYID($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMPNAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMPPOSITION($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMPSEX($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereEMPSTATUS($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereFATHERSAGE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereFATHERSBDAY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereFATHERSHMOCERTNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereFATHERSNAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereFIRSTNAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereFactory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereGROUPLIFEINSURANCECLASS($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereHMOLEVEL($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereHOUSENO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereINSURANCEAMOUNT($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereJOBTITLE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereLASTNAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereMATERNITYLEAVE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereMIDDLEINITIAL($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereMIDDLENAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereMILITARY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereMONTHYEARATTENDED1($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereMONTHYEARATTENDED2($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereMOTHERSAGE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereMOTHERSBDAY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereMOTHERSHMOCERTNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereMOTHERSNAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereNICKNAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePAGIBIGNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePASSWRD($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePATERNITYLEAVE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePERMAADDRESS($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePERMABRGY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePERMACITY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePERMAHOUSENO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePERMAPROVINCE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePHILHEALTHNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePRINCIPALHMOCERTNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePRODLINE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePROVINCE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePaLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereRATECODE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereRELATIONTOCONTACTPERSON($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereREPORTTO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereRMBRDRMTYPE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSEPARATIONREASON($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSERVICELENGTH($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSGCATEGORY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSGDESIGNATION($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSHIFTTYPE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSHUTTLE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSICKLEAVE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSIL($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSLINCR($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSLW($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSPL($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSPOUSEAGE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSPOUSEBDAY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSPOUSEHMOCERTNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSPOUSENAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSSSNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSTATION($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereTEAM($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereTINNO($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereTRAININGSSEMINARS1($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereTRAININGSSEMINARS2($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereUSERNAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereVACATIONLEAVE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereVAWC($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereVLEXCESS($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereVLINCR($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereVLSLRESETDATE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereVLYEARLYINCR($value)
 */
	class Employee extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string|null $part_name
 * @property string|null $lot_id
 * @property string|null $out_date
 * @property int|null $qty
 * @property string|null $residual
 * @property string|null $test_part
 * @property string|null $test_lot_id
 * @property string|null $focus_group
 * @property string|null $package
 * @property string|null $process_site
 * @property string|null $test_site
 * @property string|null $tray
 * @property string|null $bulk
 * @property string|null $date_loaded
 * @property string|null $process_group
 * @property string|null $ramp_time
 * @property string|null $imported_by
 * @property string|null $date_loaded_no_time
 * @property string|null $import_date
 * @property string|null $production_line
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereBulk($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereDateLoaded($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereDateLoadedNoTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereFocusGroup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereImportDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereImportedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereOutDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out wherePackage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out wherePartName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereProcessGroup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereProcessSite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereProductionLine($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereQty($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereRampTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereResidual($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereTestLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereTestPart($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereTestSite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F1F2Out whereTray($value)
 */
	class F1F2Out extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property numeric|null $running_ct
 * @property string|null $date_received
 * @property string|null $packing_list_srf
 * @property string|null $po_number
 * @property string|null $machine_number
 * @property string|null $part_number
 * @property string|null $package_code
 * @property \App\Models\F3RawPackage|null $package
 * @property string|null $lot_number
 * @property string|null $process_req
 * @property int|null $qty
 * @property int|null $good
 * @property int|null $rej
 * @property int|null $res
 * @property string|null $date_commit
 * @property string|null $actual_date_time
 * @property string|null $status
 * @property string|null $do_number
 * @property string|null $remarks
 * @property int|null $doable
 * @property string|null $focus_group
 * @property string|null $gap_analysis
 * @property numeric|null $cycle_time
 * @property string|null $imported_by
 * @property string|null $date_loaded
 * @property string|null $modified_at
 * @property string|null $modified_by
 * @property string|null $import_date
 * @property string|null $production_line
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereActualDateTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereCycleTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereDateCommit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereDateLoaded($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereDateReceived($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereDoNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereDoable($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereFocusGroup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereGapAnalysis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereGood($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereImportDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereImportedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereLotNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereMachineNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereModifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereModifiedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 wherePackage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 wherePackageCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 wherePackingListSrf($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 wherePartNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 wherePoNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereProcessReq($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereProductionLine($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereQty($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereRej($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereRemarks($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereRes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereRunningCt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3 whereStatus($value)
 */
	class F3 extends \Eloquent {}
}

namespace App\Models{
/**
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3Out newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3Out newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3Out query()
 */
	class F3Out extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $package_name
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3PackageName newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3PackageName newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3PackageName query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3PackageName whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3PackageName wherePackageName($value)
 */
	class F3PackageName extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $ppc_pickup_id
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3Pickup newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3Pickup newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3Pickup query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3Pickup wherePpcPickupId($value)
 */
	class F3Pickup extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $raw_package
 * @property int|null $lead_count
 * @property int $package_id
 * @property string|null $dimension
 * @property string|null $added_by
 * @property string|null $created_at
 * @property string|null $updated_at
 * @property string|null $canonical_body_size
 * @property string|null $raw_package_normalized
 * @property-read \App\Models\F3PackageName $f3_package_name
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage whereAddedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage whereCanonicalBodySize($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage whereDimension($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage whereLeadCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage wherePackageId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage whereRawPackage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage whereRawPackageNormalized($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3RawPackage whereUpdatedAt($value)
 */
	class F3RawPackage extends \Eloquent {}
}

namespace App\Models{
/**
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3Wip newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3Wip newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|F3Wip query()
 */
	class F3Wip extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $entry_type
 * @property string|null $lot_id
 * @property string|null $part_name
 * @property string|null $package_name
 * @property int|null $qty
 * @property int|null $qty_base
 * @property int|null $qty_override
 * @property \Illuminate\Support\Carbon $scheduled_date
 * @property int|null $machine_id
 * @property string|null $machine_snapshot
 * @property int|null $capacity_uph_snapshot
 * @property int|null $doable_snapshot
 * @property \Illuminate\Support\Carbon|null $finalized_at
 * @property float|null $sequence_order
 * @property string|null $status
 * @property string|null $tag
 * @property string|null $remarks
 * @property string|null $block_label
 * @property int|null $accu_time
 * @property \Illuminate\Support\Carbon|null $time_start
 * @property \Illuminate\Support\Carbon|null $time_end
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int $lock_version
 * @property-read \App\Models\LotQuantity|null $lotQuantity
 * @property-read \App\Models\QdnMachine|null $machineModel
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry entryType(string $type)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry today()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereAccuTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereBlockLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereCapacityUphSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereDoableSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereEntryType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereFinalizedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereLockVersion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereMachineId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereMachineSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry wherePackageName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry wherePartName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereQty($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereQtyBase($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereQtyOverride($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereRemarks($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereScheduledDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereSequenceOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereTag($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereTimeEnd($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereTimeStart($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LoadingPlanEntry whereUpdatedAt($value)
 */
	class LoadingPlanEntry extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $lot_id
 * @property string|null $partname
 * @property int|null $qty
 * @property string $status
 * @property string $received_at
 * @property string $received_by
 * @property string|null $modified_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $released_at
 * @property string|null $released_by
 * @property string|null $staged_key
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LotPosition> $activePositions
 * @property-read int|null $active_positions_count
 * @property-read \App\Models\LotStaging|null $activeStaging
 * @property-read int $age_days
 * @property-read \App\Models\LotPosition|null $latestPosition
 * @property-read \App\Models\Employee|null $modifiedBy
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LotPosition> $positions
 * @property-read int|null $positions_count
 * @property-read \App\Models\Employee|null $receivedBy
 * @property-read \App\Models\Employee|null $releasedBy
 * @property-read mixed $slot_ids
 * @property-read mixed $slots
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LotStaging> $stagings
 * @property-read int|null $stagings_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot aging()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot released()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot restocked()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot staged()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot today()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereModifiedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot wherePartname($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereQty($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereReceivedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereReceivedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereReleasedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereReleasedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereStagedKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lot whereUpdatedAt($value)
 */
	class Lot extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $target_lot_id
 * @property string $source_lot_id
 * @property \Illuminate\Support\Carbon $scheduled_date
 * @property int $transferred_qty
 * @property string|null $created_by
 * @property \Illuminate\Support\Carbon|null $reverted_at
 * @property string|null $reverted_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge whereRevertedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge whereRevertedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge whereScheduledDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge whereSourceLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge whereTargetLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge whereTransferredQty($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotMerge whereUpdatedAt($value)
 */
	class LotMerge extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $lot_id
 * @property int|null $lot_staging_id
 * @property int $rack_slot_id
 * @property string $assigned_at
 * @property string $assigned_by
 * @property string|null $released_at
 * @property string|null $released_by
 * @property int $production_line_id
 * @property string|null $v_one_machine_id
 * @property string|null $v_one_platform
 * @property string|null $v_one_status RELEASED|IN_TRANSIT|RUNNING|COMPLETED
 * @property string|null $v_one_run_status RUN|IDLE|ERROR from machine
 * @property string|null $v_one_message
 * @property string|null $v_one_running_at
 * @property string|null $v_one_completed_at
 * @property string|null $v_one_last_checked_at
 * @property-read \App\Models\Employee|null $assignedBy
 * @property-read \App\Models\Lot $lot
 * @property-read \App\Models\ProductionLine $productionLine
 * @property-read \App\Models\RackSlot|null $rackSlot
 * @property-read \App\Models\Employee|null $releasedBy
 * @property-read \App\Models\LotStaging|null $staging
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereAssignedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereAssignedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereLotStagingId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereProductionLineId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereRackSlotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereReleasedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereReleasedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereVOneCompletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereVOneLastCheckedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereVOneMachineId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereVOneMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereVOnePlatform($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereVOneRunStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereVOneRunningAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotPosition whereVOneStatus($value)
 */
	class LotPosition extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $lot_id
 * @property \Illuminate\Support\Carbon $scheduled_date
 * @property string $part_name
 * @property int $qty_base
 * @property int $split_adjustment
 * @property int $merge_adjustment
 * @property int|null $qty_override
 * @property int|null $commit
 * @property int|null $recipe_used
 * @property int|null $recipe_source_id
 * @property string $recipe_status
 * @property int|null $capacity_uph_snapshot
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\PartName|null $packageListEntry
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereCapacityUphSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereCommit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereMergeAdjustment($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity wherePartName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereQtyBase($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereQtyOverride($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereRecipeSourceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereRecipeStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereRecipeUsed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereScheduledDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereSplitAdjustment($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotQuantity whereUpdatedAt($value)
 */
	class LotQuantity extends \Eloquent {}
}

namespace App\Models{
/**
 * @property-read \App\Models\LoadingPlanEntry|null $planEntry
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRegistry newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRegistry newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRegistry query()
 */
	class LotRegistry extends \Eloquent {}
}

namespace App\Models{
/**
 * Lives in the `output_monitoring` schema — a different schema on the same
 * DB server as the main app, reached via a dedicated connection (see
 * config/database.php: 'output_monitoring').
 *
 * Deliberately kept on its own connection rather than relying on a
 * cross-schema SQL JOIN, so that:
 *   1. A failure/outage on this schema can be caught and degraded
 *      gracefully (see LotRunRepository) instead of taking down queries
 *      against the primary `lots` table.
 *   2. lot_no <-> lot_id matching stays explicit in PHP/repository code
 *      rather than relying on a cross-connection query Eloquent can't
 *      actually execute as a single statement anyway.
 *
 * @property int $id
 * @property string $lot_no
 * @property string|null $machine_id
 * @property string|null $operator_id
 * @property string|null $package
 * @property string|null $part_id
 * @property string|null $shift_id
 * @property string|null $prod_mode
 * @property \Illuminate\Support\Carbon|null $start_time
 * @property \Illuminate\Support\Carbon|null $end_time
 * @property string|null $lot_duration
 * @property int|null $lot_qty
 * @property int|null $total_process
 * @property int|null $total_taped
 * @property int|null $total_tube
 * @property int|null $sprint_uph
 * @property string|null $prod_time
 * @property string|null $assist_time
 * @property string|null $repair_time
 * @property string|null $warning_time
 * @property string|null $idle_time
 * @property string|null $mtba
 * @property string|null $mtbf
 * @property string|null $mtta
 * @property string|null $mttr
 * @property numeric|null $muba
 * @property numeric|null $mubf
 * @property numeric|null $mubaf
 * @property int|null $no_of_assist
 * @property int|null $no_of_repair
 * @property int|null $total_inspected
 * @property int|null $total_passed
 * @property int|null $reject_lead
 * @property int|null $reject_mark
 * @property int|null $reject_other
 * @property int|null $reject_pvi
 * @property int|null $vision_inspected
 * @property int|null $vision_passed
 * @property int|null $vision_rejected
 * @property bool $is_valid
 * @property string|null $invalid_reason
 * @property string|null $source_file
 * @property \Illuminate\Support\Carbon $parsed_at
 * @property-read mixed $has_ended
 * @property-read mixed $yield_percent
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun forLot(string $lotId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun latestFirst()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun valid()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereAssistTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereEndTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereIdleTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereInvalidReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereIsValid($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereLotDuration($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereLotNo($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereLotQty($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereMachineId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereMtba($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereMtbf($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereMtta($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereMttr($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereMuba($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereMubaf($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereMubf($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereNoOfAssist($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereNoOfRepair($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereOperatorId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun wherePackage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereParsedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun wherePartId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereProdMode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereProdTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereRejectLead($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereRejectMark($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereRejectOther($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereRejectPvi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereRepairTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereShiftId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereSourceFile($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereSprintUph($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereStartTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereTotalInspected($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereTotalPassed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereTotalProcess($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereTotalTaped($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereTotalTube($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereVisionInspected($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereVisionPassed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereVisionRejected($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotRun whereWarningTime($value)
 */
	class LotRun extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $parent_lot_id
 * @property string $child_lot_id
 * @property string $root_lot_id
 * @property \Illuminate\Support\Carbon $scheduled_date
 * @property int $child_qty
 * @property numeric $split_percentage
 * @property string|null $target_machine
 * @property numeric|null $sequence_order_at_split
 * @property string|null $created_by
 * @property \Illuminate\Support\Carbon|null $reverted_at
 * @property string|null $reverted_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereChildLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereChildQty($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereParentLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereRevertedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereRevertedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereRootLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereScheduledDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereSequenceOrderAtSplit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereSplitPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereTargetMachine($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotSplit whereUpdatedAt($value)
 */
	class LotSplit extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string|null $withdrawer_id
 * @property int $lot_id
 * @property string|null $partname
 * @property int|null $qty
 * @property int $cycle
 * @property string $staged_by
 * @property string $staged_at
 * @property string|null $released_by
 * @property string|null $released_at
 * @property-read \App\Models\Lot $lot
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LotPosition> $positions
 * @property-read int|null $positions_count
 * @property-read \App\Models\Employee|null $withdrawer
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging whereCycle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging whereLotId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging wherePartname($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging whereQty($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging whereReleasedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging whereReleasedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging whereStagedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging whereStagedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LotStaging whereWithdrawerId($value)
 */
	class LotStaging extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string|null $modified_at
 * @property string|null $modified_by
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BodySizeCapacityProfile> $capacityProfiles
 * @property-read int|null $capacity_profiles_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Machine newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Machine newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Machine query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Machine whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Machine whereModifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Machine whereModifiedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Machine whereName($value)
 */
	class Machine extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $machine_id
 * @property int|null $capacity
 * @property \Illuminate\Support\Carbon $effective_from
 * @property \Illuminate\Support\Carbon|null $effective_to
 * @property-read \App\Models\QdnMachine $machine
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineCapacity asOf(string $date)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineCapacity current()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineCapacity newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineCapacity newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineCapacity query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineCapacity whereCapacity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineCapacity whereEffectiveFrom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineCapacity whereEffectiveTo($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineCapacity whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineCapacity whereMachineId($value)
 */
	class MachineCapacity extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $machine_id
 * @property \Illuminate\Support\Carbon $scheduled_date
 * @property string $day_start_time
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\QdnMachine|null $machine
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDayStart newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDayStart newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDayStart query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDayStart whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDayStart whereDayStartTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDayStart whereMachineId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDayStart whereScheduledDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDayStart whereUpdatedAt($value)
 */
	class MachineDayStart extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $machine_id
 * @property string $part_name
 * @property-read \App\Models\QdnMachine $machine
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDedicatedParts newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDedicatedParts newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDedicatedParts query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDedicatedParts whereMachineId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachineDedicatedParts wherePartName($value)
 */
	class MachineDedicatedParts extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $platform
 * @property int $qty_min
 * @property int $qty_max
 * @property int $capacity_uph
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachinePlatformCapacityBand forPlatform(string $platform)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachinePlatformCapacityBand forQty(int $qty)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachinePlatformCapacityBand newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachinePlatformCapacityBand newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachinePlatformCapacityBand query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachinePlatformCapacityBand whereCapacityUph($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachinePlatformCapacityBand whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachinePlatformCapacityBand wherePlatform($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachinePlatformCapacityBand whereQtyMax($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MachinePlatformCapacityBand whereQtyMin($value)
 */
	class MachinePlatformCapacityBand extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $package_name
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PackageGroup> $groups
 * @property-read int|null $groups_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Package newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Package newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Package query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Package whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Package wherePackageName($value)
 */
	class Package extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $package_name
 * @property string $factory_name
 * @property int|null $capacity
 * @property string $effective_from
 * @property string|null $effective_to
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageCapacity newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageCapacity newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageCapacity query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageCapacity whereCapacity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageCapacity whereEffectiveFrom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageCapacity whereEffectiveTo($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageCapacity whereFactoryName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageCapacity whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageCapacity wherePackageName($value)
 */
	class PackageCapacity extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $factory
 * @property string|null $group_name
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Package> $packages
 * @property-read int|null $packages_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroup newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroup newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroup query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroup whereFactory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroup whereGroupName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroup whereId($value)
 */
	class PackageGroup extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $package_id
 * @property int $group_id
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroupMember newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroupMember newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroupMember query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroupMember whereGroupId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PackageGroupMember wherePackageId($value)
 */
	class PackageGroupMember extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string|null $focus_grp
 * @property string|null $devicename
 * @property string|null $package_type
 * @property string|null $lead_count
 * @property string|null $allocation
 * @property string|null $generic_name
 * @property string|null $drypack
 * @property int|null $recipe
 * @property string|null $dimensions
 * @property string|null $areas
 * @property string|null $productline
 * @property string|null $created_by
 * @property \Illuminate\Support\Carbon|null $date_created
 * @property string|null $updated_by
 * @property \Illuminate\Support\Carbon|null $date_updated
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereAllocation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereAreas($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereDateCreated($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereDateUpdated($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereDevicename($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereDimensions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereDrypack($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereFocusGrp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereGenericName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereLeadCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName wherePackageType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereProductline($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereRecipe($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PartName whereUpdatedBy($value)
 */
	class PartName extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id_pickup
 * @property string|null $PARTNAME
 * @property string|null $LOTID
 * @property int|null $QTY
 * @property string|null $PACKAGE
 * @property int|null $LC
 * @property string|null $ADDED_BY
 * @property string|null $DATE_CREATED
 * @property string|null $factory
 * @property-read \App\Models\Employee|null $addedBy
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp whereADDEDBY($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp whereDATECREATED($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp whereFactory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp whereIdPickup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp whereLC($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp whereLOTID($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp wherePACKAGE($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp wherePARTNAME($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PickUp whereQTY($value)
 */
	class PickUp extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $package
 * @property bool $is_telford
 * @property string|null $default_pl
 * @property \Illuminate\Support\Carbon|null $valid_from
 * @property \Illuminate\Support\Carbon|null $valid_to
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property bool $is_active
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster activeTelford()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster whereDefaultPl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster whereIsTelford($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster wherePackage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster whereValidFrom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackageMaster whereValidTo($value)
 */
	class PpcPackageMaster extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $package
 * @property string $production_line
 * @property string|null $factory
 * @property int|null $lead_count
 * @property int $priority
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $valid_from
 * @property \Illuminate\Support\Carbon|null $valid_to
 * @property string|null $note
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $partname_like
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule whereFactory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule whereLeadCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule whereNote($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule wherePackage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule wherePartnameLike($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule wherePriority($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule whereProductionLine($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule whereValidFrom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PpcPackagePlRule whereValidTo($value)
 */
	class PpcPackagePlRule extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Rack> $racks
 * @property-read int|null $racks_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLine newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLine newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLine query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLine whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLine whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLine whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLine whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLine whereUpdatedAt($value)
 */
	class ProductionLine extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $package
 * @property string|null $production_line
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLinePackageReference newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLinePackageReference newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLinePackageReference query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLinePackageReference wherePackage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductionLinePackageReference whereProductionLine($value)
 */
	class ProductionLinePackageReference extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string|null $machine_num
 * @property string|null $model
 * @property string|null $machine_platform
 * @property string|null $machine_feed_type
 * @property string|null $pmnt_no
 * @property string|null $cn_no
 * @property string|null $serial
 * @property string|null $machine_manufacturer
 * @property string|null $status
 * @property string|null $manufactured_date
 * @property string|null $location
 * @property string|null $factory
 * @property string|null $oem
 * @property string|null $dimension
 * @property string|null $input_voltage
 * @property string|null $phase
 * @property string|null $hz
 * @property string|null $amp
 * @property string|null $age
 * @property string|null $ownership
 * @property string|null $created_by
 * @property \Illuminate\Support\Carbon|null $date_created
 * @property string|null $updated_by
 * @property \Illuminate\Support\Carbon|null $date_updated
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MachineCapacity> $capacities
 * @property-read int|null $capacities_count
 * @property-read \App\Models\MachineCapacity|null $currentCapacity
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MachineDedicatedParts> $dedicatedParts
 * @property-read int|null $dedicated_parts_count
 * @property-read QdnMachine|null $machine
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereAge($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereAmp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereCnNo($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereDateCreated($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereDateUpdated($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereDimension($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereFactory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereHz($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereInputVoltage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereLocation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereMachineFeedType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereMachineManufacturer($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereMachineNum($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereMachinePlatform($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereManufacturedDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereOem($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereOwnership($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine wherePhase($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine wherePmntNo($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereSerial($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QdnMachine whereUpdatedBy($value)
 */
	class QdnMachine extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $production_line_id
 * @property string $label
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \App\Models\ProductionLine $productionLine
 * @property-read mixed $shelves
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RackSlot> $slots
 * @property-read int|null $slots_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack whereProductionLineId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rack withoutTrashed()
 */
	class Rack extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $rack_id
 * @property string $label
 * @property bool $is_manually_full
 * @property string|null $marked_full_by
 * @property \Illuminate\Support\Carbon|null $marked_full_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property bool $is_active
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LotPosition> $activePositions
 * @property-read int|null $active_positions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LotPosition> $lots
 * @property-read int|null $lots_count
 * @property-read \App\Models\Employee|null $markedFullBy
 * @property-read \App\Models\Rack|null $rack
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot whereIsManuallyFull($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot whereMarkedFullAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot whereMarkedFullBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot whereRackId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RackSlot withoutTrashed()
 */
	class RackSlot extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmailVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 */
	class User extends \Eloquent {}
}

