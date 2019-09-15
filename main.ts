/**
 * XinaBox SW02 extension for makecode
 * Base on BME680 C libary from Bosch Sensortec.
 *   https://github.com/BoschSensortec/BME680_driver
 */

enum Temperature {
    //% block="ºC"
    Celcius = 0,
    //% block="ºF"
    Fahrenheit = 1
}

enum Pressure {
    //% block="hPa"
    HectoPascal = 0,
    //% block="mbar"
    MilliBar = 1
}

enum Humidity {
    //% block="%RH"
    RelativeHumidity = 0
}

enum Length {
    //% block="meter"
    Meter = 0,
    //% block="feet"
    Feet = 1
}

/**
* BME680
*/
//% color=#444444 icon="\uf0ac"
//% groups=['On start', 'Variables', 'Optional']
namespace BME680 {

    let BME680_I2C_ADDR = 0x76

    const BME680_REG_STATUS = 0x73
    const BME680_REG_RESET = 0xE0
    const BME680_REG_ID = 0xD0
    const BME680_REG_CONFIG = 0x75

    const BME680_REG_CNTL_MEAS = 0x74
    const BME680_REG_CNTL_HUM = 0x72
    const BME680_REG_CNTL_GAS_1 = 0x71
    const BME680_REG_CNTL_GAS_0 = 0x70

    const BME680_REG_GAS_WAIT0 = 0x64
    const BME680_REG_RES_HEAT0 = 0x5A
    const BME680_REG_IDAC_HEAT0 = 0x50

    const BME680_REG_GAS_R_LSB = 0x2B
    const BME680_REG_GAS_R_MSB = 0x2A
    const BME680_REG_HUM_LSB = 0x26
    const BME680_REG_HUM_MSB = 0x25
    const BME680_REG_TEMP_XLSB = 0x24
    const BME680_REG_TEMP_LSB = 0x23
    const BME680_REG_TEMP_MSB = 0x22
    const BME680_REG_PRES_XLSB = 0x21
    const BME680_REG_PRES_XMSB = 0x20
    const BME680_REG_PRES_MSB = 0x1F
    const BME680_REG_FIELD0_ADDR = 0x1D

    const BME680_REG_CALIB_DATA_1 = 0x89
    const BME680_REG_CALIB_DATA_2 = 0xE1

    let par_t1 = 0;
    let par_t2 = 0;
    let par_t3 = 0;

    let par_p1 = 0;
    let par_p2 = 0;
    let par_p3 = 0;
    let par_p4 = 0;
    let par_p5 = 0;
    let par_p6 = 0;
    let par_p7 = 0;
    let par_p8 = 0;
    let par_p9 = 0;
    let par_p10 = 0;

    let par_h1 = 0;
    let par_h2 = 0;
    let par_h3 = 0;
    let par_h4 = 0;
    let par_h5 = 0;
    let par_h6 = 0;
    let par_h7 = 0;

    let par_gh1 = 0;
    let par_gh2 = 0;
    let par_gh3 = 0;

    let res_heat_range = 0;
    let res_heat_val = 0;
    let range_sw_err = 0;

    let os_hum = 0x01;
    let os_temp = 0x40;
    let os_pres = 0x14;
    let filter = 0x00;

    let heatr_dur = 0x0059;
    let heatr_temp = 0x0000;
    let nb_conv = 0x00;
    let run_gas = 0x00;
    let heatr_ctrl = 0x00;

    let mode = 0x01;

    let tempcal = 0;
    let temperature_ = 0;
    let humidity_ = 0;
    let pressure_ = 0;
    let altitude_ = 0;
    let dewpoint_ = 0;
    let gas = 0;
    let gas_res = 0;
    let t_fine = 0;

    function setreg(reg: number, dat: number): void {
        let buf = pins.createBuffer(2);
        buf[0] = reg;
        buf[1] = dat;
        pins.i2cWriteBuffer(BME680_I2C_ADDR, buf);
    }

    function getreg(reg: number): number {
        pins.i2cWriteNumber(BME680_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BME680_I2C_ADDR, NumberFormat.UInt8BE);
    }

    function getInt8LE(reg: number): number {
        pins.i2cWriteNumber(BME680_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BME680_I2C_ADDR, NumberFormat.Int8LE);
    }

    function getUInt16LE(reg: number): number {
        pins.i2cWriteNumber(BME680_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BME680_I2C_ADDR, NumberFormat.UInt16LE);
    }

    function getInt16LE(reg: number): number {
        pins.i2cWriteNumber(BME680_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BME680_I2C_ADDR, NumberFormat.Int16LE);
    }

    function readBlock(reg: number, count: number): number[] {
        let buf: Buffer = pins.createBuffer(count);
        pins.i2cWriteNumber(BME680_I2C_ADDR, reg, NumberFormat.UInt8BE);
        buf = pins.i2cReadBuffer(BME680_I2C_ADDR, count);

        let tempbuf: number[] = [];
        for (let i: number = 0; i < count; i++) {
            tempbuf[i] = buf[i];
        }
        return tempbuf;
    }

    function init_BME680() {

        let calib_data1: number[] = [];
        let calib_data2: number[] = [];
        let calib_data: number[] = [];

        calib_data1 = readBlock(BME680_REG_CALIB_DATA_1, 25);
        calib_data2 = readBlock(BME680_REG_CALIB_DATA_2, 16);
        calib_data = calib_data.concat(calib_data1);
        calib_data = calib_data.concat(calib_data2);

        par_t1 = (calib_data[34] << 8) | calib_data[33];
        par_t2 = (calib_data[2] << 8) | calib_data[1];
        par_t3 = (calib_data[3]);

        par_p1 = (calib_data[6] << 8) | calib_data[5];
        par_p2 = (calib_data[8] << 8) | calib_data[7];
        par_p3 = (calib_data[9]);
        par_p4 = (calib_data[12] << 8) | calib_data[11];
        par_p5 = (calib_data[14] << 8) | calib_data[13];
        par_p6 = (calib_data[16]);
        par_p7 = (calib_data[15]);
        par_p8 = (calib_data[20] << 8) | calib_data[19];
        par_p9 = (calib_data[22] << 8) | calib_data[21];
        par_p10 = (calib_data[23]);

        par_h1 = (calib_data[27] << 4) | (calib_data[26] & 0x0F);
        par_h2 = (calib_data[25] << 4) | (calib_data[26] >> 4);
        par_h3 = calib_data[28];
        par_h4 = calib_data[29];
        par_h5 = calib_data[30];
        par_h6 = calib_data[31];
        par_h7 = calib_data[32];

        par_gh1 = calib_data[37];
        par_gh2 = (calib_data[36] << 8) | calib_data[35];
        par_gh3 = calib_data[38];

        res_heat_range = calib_data[39];
        res_heat_val = calib_data[40];
        range_sw_err = calib_data[41];

        os_hum = 0x01;
        os_temp = 0x40;
        os_pres = 0x14;
        filter = 0x00;

        heatr_dur = 0x0059;
        heatr_temp = 0x0000;
        nb_conv = 0x00;
        run_gas = 0x00;
        heatr_ctrl = 0x00;

        mode = 0x01;
    }

    function setHumidityOversampling() {
        setreg(BME680_REG_CNTL_HUM, os_hum);
    }

    function setTemperatureOversampling() {
        let var_;
        var_ = getreg(BME680_REG_CNTL_MEAS);

        var_ |= os_temp;
        setreg(BME680_REG_CNTL_MEAS, var_);
    }

    function setPressureOversampling() {
        let var_;
        var_ = getreg(BME680_REG_CNTL_MEAS);

        var_ |= os_pres;
        setreg(BME680_REG_CNTL_MEAS, var_);
    }

    function setIIRFilterSize() {
        let var_;
        var_ = getreg(BME680_REG_CONFIG);

        var_ |= filter;
        setreg(BME680_REG_CONFIG, var_);
    }

    function initGasSensor(resHeat: number) {
        // Configure the BME680 Gas Sensor
        setreg(BME680_REG_CNTL_GAS_1, 0x10);
        // Set gas sampling wait time and target heater resistance
        setreg((BME680_REG_GAS_WAIT0), 1 | 0x59);
        setreg((BME680_REG_RES_HEAT0), resHeat);
    }

    function setGasHeater(set_point: number): number {
        let res_heat_x = 0;
        let var1 = 0.0, var2 = 0.0, var3 = 0.0, var4 = 0.0, var5 = 0.0;
        let par_g1 = (getreg(0xEC) << 8) | getreg(0xEB);
        let par_g2 = getreg(0xED);
        let par_g3 = getreg(0xEE);
        let res_heat_range = (getreg(0x02) & 0x30) >> 4;
        let res_heat_val = getreg(0x00);
        var1 = (par_g1 / 16.0) + 49.0;
        var2 = ((par_g2 / 32768.0) * 0.0005) + 0.00235;
        var3 = par_g3 / 1024.0;
        var4 = var1 * (1.0 + (var2 * set_point));
        var5 = var4 + (var3 * 25.0); // use 25 C as ambient temperature_
        res_heat_x = (((var5 * (4.0 / (4.0 * res_heat_range))) - 25.0) * 3.4 / ((res_heat_val * 0.002) + 1));
        return res_heat_x;
    }

    function triggerForced() {
        let var_ = 0;
        var_ |= os_temp;
        var_ |= os_pres;
        var_ |= mode;
        setreg(BME680_REG_CNTL_MEAS, var_);
    }

    function poll() {
        let status = getreg(BME680_REG_FIELD0_ADDR);

        if (status & 0x80) {
            triggerForced();

            let rawData: number[] = [];

            rawData = readBlock(BME680_REG_TEMP_MSB, 3);
            readTemperature(((rawData[0] << 16 | rawData[1] << 8 | rawData[2]) >> 4));

            rawData = readBlock(BME680_REG_PRES_MSB, 3);
            readPressure(((rawData[0] << 16 | rawData[1] << 8 | rawData[2]) >> 4));

            rawData = readBlock(BME680_REG_HUM_MSB, 2);
            readHumidity(((rawData[0] << 8) | rawData[1]));

            rawData = readBlock(BME680_REG_GAS_R_MSB, 2);
            readGas(((rawData[0] << 2 | (0xC0 & rawData[1]) >> 6)));
        }
    }

    function readTemperature(adc_temp: number) {
        let var1 = 0, var2 = 0, var3 = 0, T = 0;
        var1 = (adc_temp >> 3) - (par_t1 << 1);
        var2 = (var1 * par_t2) >> 11;
        var3 = ((((var1 >> 1) * (var1 >> 1)) >> 12) * (par_t3 << 4)) >> 14;
        t_fine = var2 + var3;
        temperature_ = ((t_fine * 5 + 128) >> 8) / 100.0;
    }

    function readPressure(adc_pres: number) {
        let var1 = 0;
        let var2 = 0;
        let var3 = 0;
        let var4 = 0;
        let pressure_comp = 0;

        var1 = ((t_fine) >> 1) - 64000;
        var2 = ((((var1 >> 2) * (var1 >> 2)) >> 11) * par_p6) >> 2;
        var2 = var2 + ((var1 * par_p5) << 1);
        var2 = (var2 >> 2) + (par_p4 << 16);
        var1 = (((((var1 >> 2) * (var1 >> 2)) >> 13) *
            (par_p3 << 5)) >> 3) +
            ((par_p2 * var1) >> 1);
        var1 = var1 >> 18;
        var1 = ((32768 + var1) * par_p1) >> 15;
        pressure_comp = 1048576 - adc_pres;
        pressure_comp = ((pressure_comp - (var2 >> 12)) * (3125));
        var4 = (1 << 31);
        if (pressure_comp >= var4)
            pressure_comp = ((pressure_comp / var1) << 1);
        else
            pressure_comp = ((pressure_comp << 1) / var1);
        var1 = (par_p9 * (((pressure_comp >> 3) * (pressure_comp >> 3)) >> 13)) >> 12;
        var2 = ((pressure_comp >> 2) * par_p8) >> 13;
        var3 = ((pressure_comp >> 8) * (pressure_comp >> 8) * (pressure_comp >> 8) * par_p10) >> 17;

        pressure_comp = (pressure_comp) + ((var1 + var2 + var3 + (par_p7 << 7)) >> 4);

        pressure_ = pressure_comp;
    }

    function readHumidity(adc_hum: number) {
        let var1;
        let var2;
        let var3;
        let var4;
        let var5;
        let var6;
        let temp_scaled;
        let calc_hum;
        temp_scaled = ((t_fine * 5) + 128) >> 8;
        var1 = (adc_hum - (par_h1 << 4)) - (((temp_scaled * par_h3) / (100)) >> 1);
        var2 = (par_h2 * (((temp_scaled * par_h4) / (100)) + (((temp_scaled * ((temp_scaled * par_h5) / (100))) >> 6) / (100)) + (1 << 14))) >> 10;
        var3 = var1 * var2;
        var4 = (((par_h6) << 7) + ((temp_scaled * par_h7) / (100))) >> 4;
        var5 = ((var3 >> 14) * (var3 >> 14)) >> 10;
        var6 = (var4 * var5) >> 1;
        calc_hum = (((var3 + var6) >> 10) * (1000)) >> 12;
        if (calc_hum > 102400) {
            calc_hum = 102400;
        } else if (calc_hum < 0) {
            calc_hum = 0;
        }
        humidity_ = (calc_hum / 1024.0);
    }

    function readGas(resVal: number) {
        let const_array1: number[] = [1, 1, 1, 1, 1, 0.99, 1, 0.992, 1, 1, 0.998, 0.995, 1, 0.99, 1, 1];
        let const_array2: number[] = [
            8000000.0, 4000000.0, 2000000.0, 1000000.0, 499500.4995, 248262.1648, 125000.0,
            63004.03226, 31281.28128, 15625.0, 7812.5, 3906.25, 1953.125, 976.5625, 488.28125, 244.140625];

        let gasRange = getreg(BME680_REG_GAS_R_LSB);
        gasRange &= 0x0F;

        let range_switch_error = getreg(0x04);

        let var1 = 0;
        var1 = (1340.0 + 5.0 * range_switch_error) * const_array1[gasRange];
        gas_res = var1 * const_array2[gasRange] / (resVal - 512.0 + var1);
    }

    //% block="BME680 begin"
    //% group="On start"
    //% weight=76 blockGap=8
    export function begin() {
        reset();
        init_BME680();
        setHumidityOversampling();
        setTemperatureOversampling();
        setPressureOversampling();
        setIIRFilterSize();
        initGasSensor(setGasHeater(200));
        setreg(BME680_REG_CNTL_MEAS, mode);
    }

    //% block="temperature %u"
    //% group="Variables"
    //% weight=76 blockGap=8
    export function temperature(u: Temperature): number {
        poll();
        temperature_ = temperature_ + tempcal;
        temperature_ = fix(temperature_)
        if (u == Temperature.Celcius) return temperature_;
        else return (32 + temperature_ * 9 / 5);
    }

    //% block="humidity %u"
    //% group="Variables"
    //% weight=76 blockGap=8
    export function humidity(u: Humidity) {
        poll();
        return fix(humidity_);
    }

    //% block="pressure"
    //% group="Variables"
    //% weight=76 blockGap=8
    export function pressure() {
        poll();
        return pressure_;
    }

    //% block="pressure altitude"
    //% group="Variables"
    //% weight=76 blockGap=8
    export function pressureAltitude() {
        poll();
        let atmospheric: number = pressure_ / 100.0;
        altitude_ = 44330.0 * (1.0 - Math.pow((atmospheric / 1013.25), 1 / 5.255));
        return altitude_;
    }

    //% block="density altitude"
    //% group="Variables"
    //% weight=76 blockGap=8
    export function densityAltitude(sea_level_pressure: number) {
        poll();
        let atmospheric: number = pressure_ / 100.0;
        altitude_ = 44330.0 * (1.0 - Math.pow((atmospheric / (sea_level_pressure / 100.0)), 1 / 5.255));
        return altitude_;
    }

    //% block="dewpoint %u"
    //% group="Variables"
    //% weight=76 blockGap=8
    export function dewpoint(u: Temperature) {
        poll();
        dewpoint_ = 243.04 * (Math.log(humidity_ / 100.0) + ((17.625 * temperature_) / (243.04 + temperature_)))
            / (17.625 - Math.log(humidity_ / 100.0) - ((17.625 * temperature_) / (243.04 + temperature_)));
        if (u == Temperature.Celcius) return dewpoint_;
        else return (32 + (dewpoint_) * 9 / 5);
    }

    //% block="IAQ"
    //% group="Variables"
    //% weight=76 blockGap=8
    export function getIAQ() {
        let IAQ: number;

        return IAQ;
    }

    //% block="reset"
    //% group="Optional"
    //% weight=76 blockGap=8
    export function reset() {
        setreg(BME680_REG_RESET, 0xB6);
        basic.pause(100)
    }

    //% block="address %on"
    //% group="Optional"
    //% weight=50 blockGap=8
    //% on.shadow="toggleOnOff"
    export function address(on: boolean) {
        if (on) BME680_I2C_ADDR = 0x76
        else BME680_I2C_ADDR = 0x77
    }

    //% block="set temperature calibration %offset"
    //% group="Optional"
    //% weight=76 blockGap=8
    export function setTempCal(offset: number) {
        tempcal = offset;
    }

    //% block="power $on"
    //% group="Optional"
    //% weight=98 blockGap=8
    //% on.shadow="toggleOnOff"
    export function onOff(on: boolean) {
        if (on) setreg(0x74, 0x01);
        else setreg(0x74, 0x00)
    }

    function fix(x: number) {
        return Math.round(x * 100) / 100
    }
}
