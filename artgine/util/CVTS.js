import { CEvent } from "../basic/CEvent.js";
import { CPath } from "../basic/CPath.js";
import { GetAudioContext } from "../system/audio/CAudio.js";
export var eInstrument;
(function (eInstrument) {
    eInstrument[eInstrument["TonsSynth"] = 0] = "TonsSynth";
    eInstrument[eInstrument["TonsMonoSynth"] = 1] = "TonsMonoSynth";
    eInstrument[eInstrument["TonsDuoSynth"] = 2] = "TonsDuoSynth";
    eInstrument[eInstrument["TonsFMSynth"] = 3] = "TonsFMSynth";
    eInstrument[eInstrument["TonsAMSynth"] = 4] = "TonsAMSynth";
    eInstrument[eInstrument["TonsMembraneSynth"] = 5] = "TonsMembraneSynth";
    eInstrument[eInstrument["TonsMetalSynth"] = 6] = "TonsMetalSynth";
    eInstrument[eInstrument["TonsPluckSynth"] = 7] = "TonsPluckSynth";
    eInstrument[eInstrument["SoundFontAcousticGrand"] = 100] = "SoundFontAcousticGrand";
    eInstrument[eInstrument["SoundFontBrightAcousticPiano"] = 101] = "SoundFontBrightAcousticPiano";
    eInstrument[eInstrument["SoundFontElectricGrandPiano"] = 102] = "SoundFontElectricGrandPiano";
    eInstrument[eInstrument["SoundFontHonkyTonkPiano"] = 103] = "SoundFontHonkyTonkPiano";
    eInstrument[eInstrument["SoundFontElectricPiano1"] = 104] = "SoundFontElectricPiano1";
    eInstrument[eInstrument["SoundFontElectricPiano2"] = 105] = "SoundFontElectricPiano2";
    eInstrument[eInstrument["SoundFontHarpsichord"] = 106] = "SoundFontHarpsichord";
    eInstrument[eInstrument["SoundFontClavinet"] = 107] = "SoundFontClavinet";
    eInstrument[eInstrument["SoundFontCelesta"] = 108] = "SoundFontCelesta";
    eInstrument[eInstrument["SoundFontGlockenspiel"] = 109] = "SoundFontGlockenspiel";
    eInstrument[eInstrument["SoundFontMusicBox"] = 110] = "SoundFontMusicBox";
    eInstrument[eInstrument["SoundFontVibraphone"] = 111] = "SoundFontVibraphone";
    eInstrument[eInstrument["SoundFontMarimba"] = 112] = "SoundFontMarimba";
    eInstrument[eInstrument["SoundFontXylophone"] = 113] = "SoundFontXylophone";
    eInstrument[eInstrument["SoundFontTubularBells"] = 114] = "SoundFontTubularBells";
    eInstrument[eInstrument["SoundFontDulcimer"] = 115] = "SoundFontDulcimer";
    eInstrument[eInstrument["SoundFontDrawbarOrgan"] = 116] = "SoundFontDrawbarOrgan";
    eInstrument[eInstrument["SoundFontPercussiveOrgan"] = 117] = "SoundFontPercussiveOrgan";
    eInstrument[eInstrument["SoundFontRockOrgan"] = 118] = "SoundFontRockOrgan";
    eInstrument[eInstrument["SoundFontChurchOrgan"] = 119] = "SoundFontChurchOrgan";
    eInstrument[eInstrument["SoundFontReedOrgan"] = 120] = "SoundFontReedOrgan";
    eInstrument[eInstrument["SoundFontAccordion"] = 121] = "SoundFontAccordion";
    eInstrument[eInstrument["SoundFontHarmonica"] = 122] = "SoundFontHarmonica";
    eInstrument[eInstrument["SoundFontTangoAccordion"] = 123] = "SoundFontTangoAccordion";
    eInstrument[eInstrument["SoundFontAcousticGuitarNylon"] = 124] = "SoundFontAcousticGuitarNylon";
    eInstrument[eInstrument["SoundFontAcousticGuitarSteel"] = 125] = "SoundFontAcousticGuitarSteel";
    eInstrument[eInstrument["SoundFontElectricGuitarJazz"] = 126] = "SoundFontElectricGuitarJazz";
    eInstrument[eInstrument["SoundFontElectricGuitarClean"] = 127] = "SoundFontElectricGuitarClean";
    eInstrument[eInstrument["SoundFontElectricGuitarMuted"] = 128] = "SoundFontElectricGuitarMuted";
    eInstrument[eInstrument["SoundFontOverdrivenGuitar"] = 129] = "SoundFontOverdrivenGuitar";
    eInstrument[eInstrument["SoundFontDistortionGuitar"] = 130] = "SoundFontDistortionGuitar";
    eInstrument[eInstrument["SoundFontGuitarHarmonics"] = 131] = "SoundFontGuitarHarmonics";
    eInstrument[eInstrument["SoundFontAcousticBass"] = 132] = "SoundFontAcousticBass";
    eInstrument[eInstrument["SoundFontElectricBassFinger"] = 133] = "SoundFontElectricBassFinger";
    eInstrument[eInstrument["SoundFontElectricBassPick"] = 134] = "SoundFontElectricBassPick";
    eInstrument[eInstrument["SoundFontFretlessBass"] = 135] = "SoundFontFretlessBass";
    eInstrument[eInstrument["SoundFontSlapBass1"] = 136] = "SoundFontSlapBass1";
    eInstrument[eInstrument["SoundFontSlapBass2"] = 137] = "SoundFontSlapBass2";
    eInstrument[eInstrument["SoundFontSynthBass1"] = 138] = "SoundFontSynthBass1";
    eInstrument[eInstrument["SoundFontSynthBass2"] = 139] = "SoundFontSynthBass2";
    eInstrument[eInstrument["SoundFontViolin"] = 140] = "SoundFontViolin";
    eInstrument[eInstrument["SoundFontViola"] = 141] = "SoundFontViola";
    eInstrument[eInstrument["SoundFontCello"] = 142] = "SoundFontCello";
    eInstrument[eInstrument["SoundFontContrabass"] = 143] = "SoundFontContrabass";
    eInstrument[eInstrument["SoundFontTremoloStrings"] = 144] = "SoundFontTremoloStrings";
    eInstrument[eInstrument["SoundFontPizzicatoStrings"] = 145] = "SoundFontPizzicatoStrings";
    eInstrument[eInstrument["SoundFontOrchestralHarp"] = 146] = "SoundFontOrchestralHarp";
    eInstrument[eInstrument["SoundFontTimpani"] = 147] = "SoundFontTimpani";
    eInstrument[eInstrument["SoundFontStringEnsemble1"] = 148] = "SoundFontStringEnsemble1";
    eInstrument[eInstrument["SoundFontStringEnsemble2"] = 149] = "SoundFontStringEnsemble2";
    eInstrument[eInstrument["SoundFontSynthStrings1"] = 150] = "SoundFontSynthStrings1";
    eInstrument[eInstrument["SoundFontSynthStrings2"] = 151] = "SoundFontSynthStrings2";
    eInstrument[eInstrument["SoundFontChoirAahs"] = 152] = "SoundFontChoirAahs";
    eInstrument[eInstrument["SoundFontVoiceOohs"] = 153] = "SoundFontVoiceOohs";
    eInstrument[eInstrument["SoundFontSynthChoir"] = 154] = "SoundFontSynthChoir";
    eInstrument[eInstrument["SoundFontOrchestraHit"] = 155] = "SoundFontOrchestraHit";
    eInstrument[eInstrument["SoundFontTrumpet"] = 156] = "SoundFontTrumpet";
    eInstrument[eInstrument["SoundFontTrombone"] = 157] = "SoundFontTrombone";
    eInstrument[eInstrument["SoundFontTuba"] = 158] = "SoundFontTuba";
    eInstrument[eInstrument["SoundFontMutedTrumpet"] = 159] = "SoundFontMutedTrumpet";
    eInstrument[eInstrument["SoundFontFrenchHorn"] = 160] = "SoundFontFrenchHorn";
    eInstrument[eInstrument["SoundFontBrassSection"] = 161] = "SoundFontBrassSection";
    eInstrument[eInstrument["SoundFontSynthBrass1"] = 162] = "SoundFontSynthBrass1";
    eInstrument[eInstrument["SoundFontSynthBrass2"] = 163] = "SoundFontSynthBrass2";
    eInstrument[eInstrument["SoundFontSopranoSax"] = 164] = "SoundFontSopranoSax";
    eInstrument[eInstrument["SoundFontAltoSax"] = 165] = "SoundFontAltoSax";
    eInstrument[eInstrument["SoundFontTenorSax"] = 166] = "SoundFontTenorSax";
    eInstrument[eInstrument["SoundFontBaritoneSax"] = 167] = "SoundFontBaritoneSax";
    eInstrument[eInstrument["SoundFontOboe"] = 168] = "SoundFontOboe";
    eInstrument[eInstrument["SoundFontEnglishHorn"] = 169] = "SoundFontEnglishHorn";
    eInstrument[eInstrument["SoundFontBassoon"] = 170] = "SoundFontBassoon";
    eInstrument[eInstrument["SoundFontClarinet"] = 171] = "SoundFontClarinet";
    eInstrument[eInstrument["SoundFontPiccolo"] = 172] = "SoundFontPiccolo";
    eInstrument[eInstrument["SoundFontFlute"] = 173] = "SoundFontFlute";
    eInstrument[eInstrument["SoundFontRecorder"] = 174] = "SoundFontRecorder";
    eInstrument[eInstrument["SoundFontPanFlute"] = 175] = "SoundFontPanFlute";
    eInstrument[eInstrument["SoundFontBlownBottle"] = 176] = "SoundFontBlownBottle";
    eInstrument[eInstrument["SoundFontShakuhachi"] = 177] = "SoundFontShakuhachi";
    eInstrument[eInstrument["SoundFontWhistle"] = 178] = "SoundFontWhistle";
    eInstrument[eInstrument["SoundFontOcarina"] = 179] = "SoundFontOcarina";
    eInstrument[eInstrument["SoundFontLead1Square"] = 180] = "SoundFontLead1Square";
    eInstrument[eInstrument["SoundFontLead2Sawtooth"] = 181] = "SoundFontLead2Sawtooth";
    eInstrument[eInstrument["SoundFontLead3Calliope"] = 182] = "SoundFontLead3Calliope";
    eInstrument[eInstrument["SoundFontLead4Chiff"] = 183] = "SoundFontLead4Chiff";
    eInstrument[eInstrument["SoundFontLead5Charang"] = 184] = "SoundFontLead5Charang";
    eInstrument[eInstrument["SoundFontLead6Voice"] = 185] = "SoundFontLead6Voice";
    eInstrument[eInstrument["SoundFontLead7Fifths"] = 186] = "SoundFontLead7Fifths";
    eInstrument[eInstrument["SoundFontLead8BassLead"] = 187] = "SoundFontLead8BassLead";
    eInstrument[eInstrument["SoundFontPad1NewAge"] = 188] = "SoundFontPad1NewAge";
    eInstrument[eInstrument["SoundFontPad2Warm"] = 189] = "SoundFontPad2Warm";
    eInstrument[eInstrument["SoundFontPad3Polysynth"] = 190] = "SoundFontPad3Polysynth";
    eInstrument[eInstrument["SoundFontPad4Choir"] = 191] = "SoundFontPad4Choir";
    eInstrument[eInstrument["SoundFontPad5Bowed"] = 192] = "SoundFontPad5Bowed";
    eInstrument[eInstrument["SoundFontPad6Metallic"] = 193] = "SoundFontPad6Metallic";
    eInstrument[eInstrument["SoundFontPad7Halo"] = 194] = "SoundFontPad7Halo";
    eInstrument[eInstrument["SoundFontPad8Sweep"] = 195] = "SoundFontPad8Sweep";
    eInstrument[eInstrument["SoundFontFX1Rain"] = 196] = "SoundFontFX1Rain";
    eInstrument[eInstrument["SoundFontFX2Soundtrack"] = 197] = "SoundFontFX2Soundtrack";
    eInstrument[eInstrument["SoundFontFX3Crystal"] = 198] = "SoundFontFX3Crystal";
    eInstrument[eInstrument["SoundFontFX4Atmosphere"] = 199] = "SoundFontFX4Atmosphere";
    eInstrument[eInstrument["SoundFontFX5Brightness"] = 200] = "SoundFontFX5Brightness";
    eInstrument[eInstrument["SoundFontFX6Goblins"] = 201] = "SoundFontFX6Goblins";
    eInstrument[eInstrument["SoundFontFX7Echoes"] = 202] = "SoundFontFX7Echoes";
    eInstrument[eInstrument["SoundFontFX8SciFi"] = 203] = "SoundFontFX8SciFi";
    eInstrument[eInstrument["SoundFontSitar"] = 204] = "SoundFontSitar";
    eInstrument[eInstrument["SoundFontBanjo"] = 205] = "SoundFontBanjo";
    eInstrument[eInstrument["SoundFontShamisen"] = 206] = "SoundFontShamisen";
    eInstrument[eInstrument["SoundFontKoto"] = 207] = "SoundFontKoto";
    eInstrument[eInstrument["SoundFontKalimba"] = 208] = "SoundFontKalimba";
    eInstrument[eInstrument["SoundFontBagpipe"] = 209] = "SoundFontBagpipe";
    eInstrument[eInstrument["SoundFontFiddle"] = 210] = "SoundFontFiddle";
    eInstrument[eInstrument["SoundFontShanai"] = 211] = "SoundFontShanai";
    eInstrument[eInstrument["SoundFontTinkleBell"] = 212] = "SoundFontTinkleBell";
    eInstrument[eInstrument["SoundFontAgogo"] = 213] = "SoundFontAgogo";
    eInstrument[eInstrument["SoundFontSteelDrums"] = 214] = "SoundFontSteelDrums";
    eInstrument[eInstrument["SoundFontWoodblock"] = 215] = "SoundFontWoodblock";
    eInstrument[eInstrument["SoundFontTaikoDrum"] = 216] = "SoundFontTaikoDrum";
    eInstrument[eInstrument["SoundFontMelodicTom"] = 217] = "SoundFontMelodicTom";
    eInstrument[eInstrument["SoundFontSynthDrum"] = 218] = "SoundFontSynthDrum";
    eInstrument[eInstrument["SoundFontReverseCymbal"] = 219] = "SoundFontReverseCymbal";
    eInstrument[eInstrument["SoundFontGuitarFretNoise"] = 220] = "SoundFontGuitarFretNoise";
    eInstrument[eInstrument["SoundFontBreathNoise"] = 221] = "SoundFontBreathNoise";
    eInstrument[eInstrument["SoundFontSeashore"] = 222] = "SoundFontSeashore";
    eInstrument[eInstrument["SoundFontBirdTweet"] = 223] = "SoundFontBirdTweet";
    eInstrument[eInstrument["SoundFontTelephoneRing"] = 224] = "SoundFontTelephoneRing";
    eInstrument[eInstrument["SoundFontHelicopter"] = 225] = "SoundFontHelicopter";
    eInstrument[eInstrument["SoundFontApplause"] = 226] = "SoundFontApplause";
    eInstrument[eInstrument["SoundFontGunshot"] = 227] = "SoundFontGunshot";
    eInstrument[eInstrument["SoundFontDrumKit"] = 228] = "SoundFontDrumKit";
})(eInstrument || (eInstrument = {}));
export var eNote;
(function (eNote) {
    eNote["A0"] = "A0";
    eNote["AS0"] = "A#0";
    eNote["B0"] = "B0";
    eNote["C1"] = "C1";
    eNote["CS1"] = "C#1";
    eNote["D1"] = "D1";
    eNote["DS1"] = "D#1";
    eNote["E1"] = "E1";
    eNote["F1"] = "F1";
    eNote["FS1"] = "F#1";
    eNote["G1"] = "G1";
    eNote["GS1"] = "G#1";
    eNote["A1"] = "A1";
    eNote["AS1"] = "A#1";
    eNote["B1"] = "B1";
    eNote["C2"] = "C2";
    eNote["CS2"] = "C#2";
    eNote["D2"] = "D2";
    eNote["DS2"] = "D#2";
    eNote["E2"] = "E2";
    eNote["F2"] = "F2";
    eNote["FS2"] = "F#2";
    eNote["G2"] = "G2";
    eNote["GS2"] = "G#2";
    eNote["A2"] = "A2";
    eNote["AS2"] = "A#2";
    eNote["B2"] = "B2";
    eNote["C3"] = "C3";
    eNote["CS3"] = "C#3";
    eNote["D3"] = "D3";
    eNote["DS3"] = "D#3";
    eNote["E3"] = "E3";
    eNote["F3"] = "F3";
    eNote["FS3"] = "F#3";
    eNote["G3"] = "G3";
    eNote["GS3"] = "G#3";
    eNote["A3"] = "A3";
    eNote["AS3"] = "A#3";
    eNote["B3"] = "B3";
    eNote["C4"] = "C4";
    eNote["CS4"] = "C#4";
    eNote["D4"] = "D4";
    eNote["DS4"] = "D#4";
    eNote["E4"] = "E4";
    eNote["F4"] = "F4";
    eNote["FS4"] = "F#4";
    eNote["G4"] = "G4";
    eNote["GS4"] = "G#4";
    eNote["A4"] = "A4";
    eNote["AS4"] = "A#4";
    eNote["B4"] = "B4";
    eNote["C5"] = "C5";
    eNote["CS5"] = "C#5";
    eNote["D5"] = "D5";
    eNote["DS5"] = "D#5";
    eNote["E5"] = "E5";
    eNote["F5"] = "F5";
    eNote["FS5"] = "F#5";
    eNote["G5"] = "G5";
    eNote["GS5"] = "G#5";
    eNote["A5"] = "A5";
    eNote["AS5"] = "A#5";
    eNote["B5"] = "B5";
    eNote["C6"] = "C6";
    eNote["CS6"] = "C#6";
    eNote["D6"] = "D6";
    eNote["DS6"] = "D#6";
    eNote["E6"] = "E6";
    eNote["F6"] = "F6";
    eNote["FS6"] = "F#6";
    eNote["G6"] = "G6";
    eNote["GS6"] = "G#6";
    eNote["A6"] = "A6";
    eNote["AS6"] = "A#6";
    eNote["B6"] = "B6";
    eNote["C7"] = "C7";
    eNote["CS7"] = "C#7";
    eNote["D7"] = "D7";
    eNote["DS7"] = "D#7";
    eNote["E7"] = "E7";
    eNote["F7"] = "F7";
    eNote["FS7"] = "F#7";
    eNote["G7"] = "G7";
    eNote["GS7"] = "G#7";
    eNote["A7"] = "A7";
    eNote["AS7"] = "A#7";
    eNote["B7"] = "B7";
    eNote["C8"] = "C8";
    eNote["BF0"] = "A#0";
    eNote["DF1"] = "C#1";
    eNote["EF1"] = "D#1";
    eNote["GF1"] = "F#1";
    eNote["AF1"] = "G#1";
    eNote["BF1"] = "A#1";
    eNote["DF2"] = "C#2";
    eNote["EF2"] = "D#2";
    eNote["GF2"] = "F#2";
    eNote["AF2"] = "G#2";
    eNote["BF2"] = "A#2";
    eNote["DF3"] = "C#3";
    eNote["EF3"] = "D#3";
    eNote["GF3"] = "F#3";
    eNote["AF3"] = "G#3";
    eNote["BF3"] = "A#3";
    eNote["DF4"] = "C#4";
    eNote["EF4"] = "D#4";
    eNote["GF4"] = "F#4";
    eNote["AF4"] = "G#4";
    eNote["BF4"] = "A#4";
    eNote["DF5"] = "C#5";
    eNote["EF5"] = "D#5";
    eNote["GF5"] = "F#5";
    eNote["AF5"] = "G#5";
    eNote["BF5"] = "A#5";
    eNote["DF6"] = "C#6";
    eNote["EF6"] = "D#6";
    eNote["GF6"] = "F#6";
    eNote["AF6"] = "G#6";
    eNote["BF6"] = "A#6";
    eNote["DF7"] = "C#7";
    eNote["EF7"] = "D#7";
    eNote["GF7"] = "F#7";
    eNote["AF7"] = "G#7";
    eNote["BF7"] = "A#7";
})(eNote || (eNote = {}));
export var eDuration;
(function (eDuration) {
    eDuration["Whole"] = "1n";
    eDuration["Half"] = "2n";
    eDuration["Quarter"] = "4n";
    eDuration["Eighth"] = "8n";
    eDuration["Sixteenth"] = "16n";
    eDuration["ThirtySecond"] = "32n";
    eDuration["n1"] = "1n";
    eDuration["n2"] = "2n";
    eDuration["n4"] = "4n";
    eDuration["n8"] = "8n";
    eDuration["n16"] = "16n";
    eDuration["n32"] = "32n";
    eDuration["\uD834\uDD5D"] = "1n";
    eDuration["\uD834\uDD5E"] = "2n";
    eDuration["\u2669"] = "4n";
    eDuration["\u266A"] = "8n";
    eDuration["\u266B"] = "16n";
    eDuration["\u266C"] = "32n";
})(eDuration || (eDuration = {}));
export class CVSTSheet {
    constructor(_attack, _note, _time, _volume = 1) {
        this.mAttack = _attack;
        this.mNote = _note;
        this.mTime = _time;
        this.mVolume = _volume;
    }
    mAttack = true;
    mNote = "C4";
    mTime = 0;
    mDelay = 0;
    mVolume = 1;
}
export class CVSTTrack {
    mSheets = new Array();
    mInstrument = eInstrument.TonsSynth;
    mScale = new Array();
    mTempo = 120;
}
export class CVST {
    static eInstrument = eInstrument;
    static eNote = eNote;
    static eDuration = eDuration;
    mUse = new Array;
    async Init(_count = 6) { return true; }
    async SetInstrument(_ins, _count) { }
    Attack(_note, _volume = 1) { }
    Release(_note) { }
    AttackRelease(_note, _duration = eDuration.Eighth, _volume = 1) { }
    isValidNote(note) {
        return /^[A-Ga-g]/.test(note);
    }
    ReleaseAll() {
        for (let use of this.mUse) {
            this.Release(use);
        }
    }
    IsUse(_note) {
        return this.mUse.includes(_note);
    }
}
export class CTons extends CVST {
    mInsArr = new Array;
    async Init() {
        if (Tone.getContext().state !== "running") {
            await Tone.start();
            this.SetInstrument(eInstrument.TonsSynth, 6);
            return false;
        }
        return true;
    }
    async SetInstrument(_ins, _count) {
        for (let i = 0; i < _count; ++i) {
            if (this.mInsArr[i] != null && this.mInsArr[i].dispose)
                this.mInsArr[i].dispose();
            this.mUse[i] = "";
            switch (_ins) {
                case eInstrument.TonsSynth:
                    this.mInsArr[i] = new Tone.Synth().toDestination();
                    break;
                case eInstrument.TonsMonoSynth:
                    this.mInsArr[i] = new Tone.MonoSynth().toDestination();
                    break;
                case eInstrument.TonsDuoSynth:
                    this.mInsArr[i] = new Tone.DuoSynth().toDestination();
                    break;
                case eInstrument.TonsFMSynth:
                    this.mInsArr[i] = new Tone.FMSynth().toDestination();
                    break;
                case eInstrument.TonsAMSynth:
                    this.mInsArr[i] = new Tone.AMSynth().toDestination();
                    break;
                case eInstrument.TonsMembraneSynth:
                    this.mInsArr[i] = new Tone.MembraneSynth().toDestination();
                    break;
                case eInstrument.TonsMetalSynth:
                    this.mInsArr[i] = new Tone.MetalSynth().toDestination();
                    break;
                case eInstrument.TonsPluckSynth:
                    this.mInsArr[i] = new Tone.PluckSynth().toDestination();
                    break;
                default:
                    this.mInsArr[i] = new Tone.Synth().toDestination();
            }
        }
    }
    Attack(_note, _volume = 1) {
    }
    Release(_note) {
    }
    AttackRelease(_note, _duration = eDuration.Eighth, _volume = 1) {
    }
}
const eInstrumentToSoundfontName = {
    [eInstrument.SoundFontAcousticGrand]: "acoustic_grand_piano",
    [eInstrument.SoundFontBrightAcousticPiano]: "bright_acoustic_piano",
    [eInstrument.SoundFontElectricGrandPiano]: "electric_grand_piano",
    [eInstrument.SoundFontHonkyTonkPiano]: "honkytonk_piano",
    [eInstrument.SoundFontElectricPiano1]: "electric_piano_1",
    [eInstrument.SoundFontElectricPiano2]: "electric_piano_2",
    [eInstrument.SoundFontHarpsichord]: "harpsichord",
    [eInstrument.SoundFontClavinet]: "clavinet",
    [eInstrument.SoundFontCelesta]: "celesta",
    [eInstrument.SoundFontGlockenspiel]: "glockenspiel",
    [eInstrument.SoundFontMusicBox]: "music_box",
    [eInstrument.SoundFontVibraphone]: "vibraphone",
    [eInstrument.SoundFontMarimba]: "marimba",
    [eInstrument.SoundFontXylophone]: "xylophone",
    [eInstrument.SoundFontTubularBells]: "tubular_bells",
    [eInstrument.SoundFontDulcimer]: "dulcimer",
    [eInstrument.SoundFontDrawbarOrgan]: "drawbar_organ",
    [eInstrument.SoundFontPercussiveOrgan]: "percussive_organ",
    [eInstrument.SoundFontRockOrgan]: "rock_organ",
    [eInstrument.SoundFontChurchOrgan]: "church_organ",
    [eInstrument.SoundFontReedOrgan]: "reed_organ",
    [eInstrument.SoundFontAccordion]: "accordion",
    [eInstrument.SoundFontHarmonica]: "harmonica",
    [eInstrument.SoundFontTangoAccordion]: "tango_accordion",
    [eInstrument.SoundFontAcousticGuitarNylon]: "acoustic_guitar_nylon",
    [eInstrument.SoundFontAcousticGuitarSteel]: "acoustic_guitar_steel",
    [eInstrument.SoundFontElectricGuitarJazz]: "electric_guitar_jazz",
    [eInstrument.SoundFontElectricGuitarClean]: "electric_guitar_clean",
    [eInstrument.SoundFontElectricGuitarMuted]: "electric_guitar_muted",
    [eInstrument.SoundFontOverdrivenGuitar]: "overdriven_guitar",
    [eInstrument.SoundFontDistortionGuitar]: "distortion_guitar",
    [eInstrument.SoundFontGuitarHarmonics]: "guitar_harmonics",
    [eInstrument.SoundFontAcousticBass]: "acoustic_bass",
    [eInstrument.SoundFontElectricBassFinger]: "electric_bass_finger",
    [eInstrument.SoundFontElectricBassPick]: "electric_bass_pick",
    [eInstrument.SoundFontFretlessBass]: "fretless_bass",
    [eInstrument.SoundFontSlapBass1]: "slap_bass_1",
    [eInstrument.SoundFontSlapBass2]: "slap_bass_2",
    [eInstrument.SoundFontSynthBass1]: "synth_bass_1",
    [eInstrument.SoundFontSynthBass2]: "synth_bass_2",
    [eInstrument.SoundFontViolin]: "violin",
    [eInstrument.SoundFontViola]: "viola",
    [eInstrument.SoundFontCello]: "cello",
    [eInstrument.SoundFontContrabass]: "contrabass",
    [eInstrument.SoundFontTremoloStrings]: "tremolo_strings",
    [eInstrument.SoundFontPizzicatoStrings]: "pizzicato_strings",
    [eInstrument.SoundFontOrchestralHarp]: "orchestral_harp",
    [eInstrument.SoundFontTimpani]: "timpani",
    [eInstrument.SoundFontStringEnsemble1]: "string_ensemble_1",
    [eInstrument.SoundFontStringEnsemble2]: "string_ensemble_2",
    [eInstrument.SoundFontSynthStrings1]: "synth_strings_1",
    [eInstrument.SoundFontSynthStrings2]: "synth_strings_2",
    [eInstrument.SoundFontChoirAahs]: "choir_aahs",
    [eInstrument.SoundFontVoiceOohs]: "voice_oohs",
    [eInstrument.SoundFontSynthChoir]: "synth_choir",
    [eInstrument.SoundFontOrchestraHit]: "orchestra_hit",
    [eInstrument.SoundFontTrumpet]: "trumpet",
    [eInstrument.SoundFontTrombone]: "trombone",
    [eInstrument.SoundFontTuba]: "tuba",
    [eInstrument.SoundFontMutedTrumpet]: "muted_trumpet",
    [eInstrument.SoundFontFrenchHorn]: "french_horn",
    [eInstrument.SoundFontBrassSection]: "brass_section",
    [eInstrument.SoundFontSynthBrass1]: "synth_brass_1",
    [eInstrument.SoundFontSynthBrass2]: "synth_brass_2",
    [eInstrument.SoundFontSopranoSax]: "soprano_sax",
    [eInstrument.SoundFontAltoSax]: "alto_sax",
    [eInstrument.SoundFontTenorSax]: "tenor_sax",
    [eInstrument.SoundFontBaritoneSax]: "baritone_sax",
    [eInstrument.SoundFontOboe]: "oboe",
    [eInstrument.SoundFontEnglishHorn]: "english_horn",
    [eInstrument.SoundFontBassoon]: "bassoon",
    [eInstrument.SoundFontClarinet]: "clarinet",
    [eInstrument.SoundFontPiccolo]: "piccolo",
    [eInstrument.SoundFontFlute]: "flute",
    [eInstrument.SoundFontRecorder]: "recorder",
    [eInstrument.SoundFontPanFlute]: "pan_flute",
    [eInstrument.SoundFontBlownBottle]: "blown_bottle",
    [eInstrument.SoundFontShakuhachi]: "shakuhachi",
    [eInstrument.SoundFontWhistle]: "whistle",
    [eInstrument.SoundFontOcarina]: "ocarina",
    [eInstrument.SoundFontLead1Square]: "lead_1_square",
    [eInstrument.SoundFontLead2Sawtooth]: "lead_2_sawtooth",
    [eInstrument.SoundFontLead3Calliope]: "lead_3_calliope",
    [eInstrument.SoundFontLead4Chiff]: "lead_4_chiff",
    [eInstrument.SoundFontLead5Charang]: "lead_5_charang",
    [eInstrument.SoundFontLead6Voice]: "lead_6_voice",
    [eInstrument.SoundFontLead7Fifths]: "lead_7_fifths",
    [eInstrument.SoundFontLead8BassLead]: "lead_8_bass_lead",
    [eInstrument.SoundFontPad1NewAge]: "pad_1_new_age",
    [eInstrument.SoundFontPad2Warm]: "pad_2_warm",
    [eInstrument.SoundFontPad3Polysynth]: "pad_3_polysynth",
    [eInstrument.SoundFontPad4Choir]: "pad_4_choir",
    [eInstrument.SoundFontPad5Bowed]: "pad_5_bowed",
    [eInstrument.SoundFontPad6Metallic]: "pad_6_metallic",
    [eInstrument.SoundFontPad7Halo]: "pad_7_halo",
    [eInstrument.SoundFontPad8Sweep]: "pad_8_sweep",
    [eInstrument.SoundFontFX1Rain]: "fx_1_rain",
    [eInstrument.SoundFontFX2Soundtrack]: "fx_2_soundtrack",
    [eInstrument.SoundFontFX3Crystal]: "fx_3_crystal",
    [eInstrument.SoundFontFX4Atmosphere]: "fx_4_atmosphere",
    [eInstrument.SoundFontFX5Brightness]: "fx_5_brightness",
    [eInstrument.SoundFontFX6Goblins]: "fx_6_goblins",
    [eInstrument.SoundFontFX7Echoes]: "fx_7_echoes",
    [eInstrument.SoundFontFX8SciFi]: "fx_8_sci-fi",
    [eInstrument.SoundFontSitar]: "sitar",
    [eInstrument.SoundFontBanjo]: "banjo",
    [eInstrument.SoundFontShamisen]: "shamisen",
    [eInstrument.SoundFontKoto]: "koto",
    [eInstrument.SoundFontKalimba]: "kalimba",
    [eInstrument.SoundFontBagpipe]: "bagpipe",
    [eInstrument.SoundFontFiddle]: "fiddle",
    [eInstrument.SoundFontShanai]: "shanai",
    [eInstrument.SoundFontTinkleBell]: "tinkle_bell",
    [eInstrument.SoundFontAgogo]: "agogo",
    [eInstrument.SoundFontSteelDrums]: "steel_drums",
    [eInstrument.SoundFontWoodblock]: "woodblock",
    [eInstrument.SoundFontTaikoDrum]: "taiko_drum",
    [eInstrument.SoundFontMelodicTom]: "melodic_tom",
    [eInstrument.SoundFontSynthDrum]: "synth_drum",
    [eInstrument.SoundFontReverseCymbal]: "reverse_cymbal",
    [eInstrument.SoundFontGuitarFretNoise]: "guitar_fret_noise",
    [eInstrument.SoundFontBreathNoise]: "breath_noise",
    [eInstrument.SoundFontSeashore]: "seashore",
    [eInstrument.SoundFontBirdTweet]: "bird_tweet",
    [eInstrument.SoundFontTelephoneRing]: "telephone_ring",
    [eInstrument.SoundFontHelicopter]: "helicopter",
    [eInstrument.SoundFontApplause]: "applause",
    [eInstrument.SoundFontGunshot]: "gunshot",
    [eInstrument.SoundFontDrumKit]: "drum"
};
var gInstrumentMap = new Map();
export class CSoundFont extends CVST {
    mAudioCtx;
    mPlayer = [];
    mIns;
    mMasterGain;
    constructor() {
        super();
        this.mAudioCtx = GetAudioContext();
        this.mMasterGain = this.mAudioCtx.createGain();
        this.mMasterGain.gain.value = 1.5;
        this.mMasterGain.connect(this.mAudioCtx.destination);
    }
    async SetInstrument(_ins, _count) {
        const name = eInstrumentToSoundfontName[_ins] || "acoustic_grand_piano";
        let load = gInstrumentMap.get(name);
        if (load == null) {
            let inst = await Soundfont.instrument(this.mAudioCtx, name, {
                soundfont: 'MusyngKite',
                format: 'mp3',
                nameToUrl: (name, soundfont = 'MusyngKite', format = 'mp3') => {
                    return CPath.PHPC() + `artgine/external/legacy/soundfont/MusyngKite/${name}-${format}.js`;
                }
            });
            gInstrumentMap.set(name, inst);
            load = inst;
        }
        this.mIns = load;
        for (let i = 0; i < _count; ++i) {
            this.mUse[i] = "";
            this.mPlayer[i] = null;
        }
    }
    async Init(_count = 6, _instrument = eInstrument.SoundFontAcousticGrand) {
        await this.SetInstrument(_instrument, _count);
        return true;
    }
    Attack(note, volume = 1) {
    }
    Release(note) {
    }
    AttackRelease(note, duration = "8n", _volume = 1) {
    }
}
export class CSong {
    static eType = {
        Tone: "Tone",
        SoundFont: "SoundFont",
    };
    mVTSArr = new Array();
    Play(_type, _song, _trackPlay = null, _delay = 0) {
        this.Stop();
        const startTime = GetAudioContext().currentTime * 1000;
        for (let j = 0; j < _song.length; ++j) {
            if (_trackPlay != null && _trackPlay.length > j && _trackPlay[j] == false)
                continue;
            const track = _song[j];
            let vts;
            if (_type == CSong.eType.Tone)
                vts = new CTons();
            else if (_type == CSong.eType.SoundFont)
                vts = new CSoundFont();
            vts.SetInstrument(track.mInstrument, 6);
            this.mVTSArr.push(vts);
            for (let i = 0; i < track.mSheets.length; ++i) {
                const sheet = track.mSheets[i];
                const time = startTime + (sheet.mTime + _delay);
                setTimeout(() => {
                    if (sheet.mAttack) {
                        vts.Attack(sheet.mNote, sheet.mVolume);
                    }
                    else {
                        vts.Release(sheet.mNote);
                    }
                }, time);
            }
        }
    }
    Stop() {
        for (let i = 0; i < this.mVTSArr.length; ++i) {
            this.mVTSArr[i].ReleaseAll();
        }
        this.mVTSArr = new Array();
    }
    static On(_song, _trackOff, _event) {
        _event = CEvent.ToCEvent(_event);
        const track = _song[_trackOff];
        const startTime = GetAudioContext().currentTime * 1000;
        for (let i = 0; i < track.mSheets.length; ++i) {
            const sheet = track.mSheets[i];
            const time = startTime + sheet.mTime;
            setTimeout(() => {
                _event.Call(sheet);
            }, time);
        }
    }
    static ParseMML(source, _instrument = []) {
        return null;
    }
}
import CVTS_imple from "../util_imple/CVTS.js";
CVTS_imple();
