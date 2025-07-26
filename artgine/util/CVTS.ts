import {CConsol} from "../basic/CConsol.js";
import {CEvent} from "../basic/CEvent.js";
import {CPath} from "../basic/CPath.js";
import { GetAudioContext } from "../system/audio/CAudio.js";

export enum eInstrument {
    TonsSynth = 0,
    TonsMonoSynth = 1,
    TonsDuoSynth = 2,
    TonsFMSynth = 3,
    TonsAMSynth = 4,
    TonsMembraneSynth = 5,
    TonsMetalSynth = 6,
    TonsPluckSynth = 7,
    //TonsNoiseSynth = 8,
    //TonsPolySynth = 9,

    // 🎵 SoundFont 악기 (GM 128개 + Drum)
    SoundFontAcousticGrand = 100,
    SoundFontBrightAcousticPiano,
    SoundFontElectricGrandPiano,
    SoundFontHonkyTonkPiano,
    SoundFontElectricPiano1,
    SoundFontElectricPiano2,
    SoundFontHarpsichord,
    SoundFontClavinet,
    SoundFontCelesta,
    SoundFontGlockenspiel,
    SoundFontMusicBox,
    SoundFontVibraphone,
    SoundFontMarimba,
    SoundFontXylophone,
    SoundFontTubularBells,
    SoundFontDulcimer,
    SoundFontDrawbarOrgan,
    SoundFontPercussiveOrgan,
    SoundFontRockOrgan,
    SoundFontChurchOrgan,
    SoundFontReedOrgan,
    SoundFontAccordion,
    SoundFontHarmonica,
    SoundFontTangoAccordion,
    SoundFontAcousticGuitarNylon,
    SoundFontAcousticGuitarSteel,
    SoundFontElectricGuitarJazz,
    SoundFontElectricGuitarClean,
    SoundFontElectricGuitarMuted,
    SoundFontOverdrivenGuitar,
    SoundFontDistortionGuitar,
    SoundFontGuitarHarmonics,
    SoundFontAcousticBass,
    SoundFontElectricBassFinger,
    SoundFontElectricBassPick,
    SoundFontFretlessBass,
    SoundFontSlapBass1,
    SoundFontSlapBass2,
    SoundFontSynthBass1,
    SoundFontSynthBass2,
    SoundFontViolin,
    SoundFontViola,
    SoundFontCello,
    SoundFontContrabass,
    SoundFontTremoloStrings,
    SoundFontPizzicatoStrings,
    SoundFontOrchestralHarp,
    SoundFontTimpani,
    SoundFontStringEnsemble1,
    SoundFontStringEnsemble2,
    SoundFontSynthStrings1,
    SoundFontSynthStrings2,
    SoundFontChoirAahs,
    SoundFontVoiceOohs,
    SoundFontSynthChoir,
    SoundFontOrchestraHit,
    SoundFontTrumpet,
    SoundFontTrombone,
    SoundFontTuba,
    SoundFontMutedTrumpet,
    SoundFontFrenchHorn,
    SoundFontBrassSection,
    SoundFontSynthBrass1,
    SoundFontSynthBrass2,
    SoundFontSopranoSax,
    SoundFontAltoSax,
    SoundFontTenorSax,
    SoundFontBaritoneSax,
    SoundFontOboe,
    SoundFontEnglishHorn,
    SoundFontBassoon,
    SoundFontClarinet,
    SoundFontPiccolo,
    SoundFontFlute,
    SoundFontRecorder,
    SoundFontPanFlute,
    SoundFontBlownBottle,
    SoundFontShakuhachi,
    SoundFontWhistle,
    SoundFontOcarina,
    SoundFontLead1Square,
    SoundFontLead2Sawtooth,
    SoundFontLead3Calliope,
    SoundFontLead4Chiff,
    SoundFontLead5Charang,
    SoundFontLead6Voice,
    SoundFontLead7Fifths,
    SoundFontLead8BassLead,
    SoundFontPad1NewAge,
    SoundFontPad2Warm,
    SoundFontPad3Polysynth,
    SoundFontPad4Choir,
    SoundFontPad5Bowed,
    SoundFontPad6Metallic,
    SoundFontPad7Halo,
    SoundFontPad8Sweep,
    SoundFontFX1Rain,
    SoundFontFX2Soundtrack,
    SoundFontFX3Crystal,
    SoundFontFX4Atmosphere,
    SoundFontFX5Brightness,
    SoundFontFX6Goblins,
    SoundFontFX7Echoes,
    SoundFontFX8SciFi,
    SoundFontSitar,
    SoundFontBanjo,
    SoundFontShamisen,
    SoundFontKoto,
    SoundFontKalimba,
    SoundFontBagpipe,
    SoundFontFiddle,
    SoundFontShanai,
    SoundFontTinkleBell,
    SoundFontAgogo,
    SoundFontSteelDrums,
    SoundFontWoodblock,
    SoundFontTaikoDrum,
    SoundFontMelodicTom,
    SoundFontSynthDrum,
    SoundFontReverseCymbal,
    SoundFontGuitarFretNoise,
    SoundFontBreathNoise,
    SoundFontSeashore,
    SoundFontBirdTweet,
    SoundFontTelephoneRing,
    SoundFontHelicopter,
    SoundFontApplause,
    SoundFontGunshot,
    SoundFontDrumKit
}

export enum eNote {
    A0 = "A0", AS0 = "A#0", B0 = "B0",
    C1 = "C1", CS1 = "C#1", D1 = "D1", DS1 = "D#1", E1 = "E1",
    F1 = "F1", FS1 = "F#1", G1 = "G1", GS1 = "G#1",
    A1 = "A1", AS1 = "A#1", B1 = "B1",
    C2 = "C2", CS2 = "C#2", D2 = "D2", DS2 = "D#2", E2 = "E2",
    F2 = "F2", FS2 = "F#2", G2 = "G2", GS2 = "G#2",
    A2 = "A2", AS2 = "A#2", B2 = "B2",
    C3 = "C3", CS3 = "C#3", D3 = "D3", DS3 = "D#3", E3 = "E3",
    F3 = "F3", FS3 = "F#3", G3 = "G3", GS3 = "G#3",
    A3 = "A3", AS3 = "A#3", B3 = "B3",
    C4 = "C4", CS4 = "C#4", D4 = "D4", DS4 = "D#4", E4 = "E4",
    F4 = "F4", FS4 = "F#4", G4 = "G4", GS4 = "G#4",
    A4 = "A4", AS4 = "A#4", B4 = "B4",
    C5 = "C5", CS5 = "C#5", D5 = "D5", DS5 = "D#5", E5 = "E5",
    F5 = "F5", FS5 = "F#5", G5 = "G5", GS5 = "G#5",
    A5 = "A5", AS5 = "A#5", B5 = "B5",
    C6 = "C6", CS6 = "C#6", D6 = "D6", DS6 = "D#6", E6 = "E6",
    F6 = "F6", FS6 = "F#6", G6 = "G6", GS6 = "G#6",
    A6 = "A6", AS6 = "A#6", B6 = "B6",
    C7 = "C7", CS7 = "C#7", D7 = "D7", DS7 = "D#7", E7 = "E7",
    F7 = "F7", FS7 = "F#7", G7 = "G7", GS7 = "G#7",
    A7 = "A7", AS7 = "A#7", B7 = "B7",
    C8 = "C8",

    // 플랫 이름은 별칭으로 뒤에 위치
    BF0 = "A#0", DF1 = "C#1", EF1 = "D#1", GF1 = "F#1", AF1 = "G#1",
    BF1 = "A#1", DF2 = "C#2", EF2 = "D#2", GF2 = "F#2", AF2 = "G#2",
    BF2 = "A#2", DF3 = "C#3", EF3 = "D#3", GF3 = "F#3", AF3 = "G#3",
    BF3 = "A#3", DF4 = "C#4", EF4 = "D#4", GF4 = "F#4", AF4 = "G#4",
    BF4 = "A#4", DF5 = "C#5", EF5 = "D#5", GF5 = "F#5", AF5 = "G#5",
    BF5 = "A#5", DF6 = "C#6", EF6 = "D#6", GF6 = "F#6", AF6 = "G#6",
    BF6 = "A#6", DF7 = "C#7", EF7 = "D#7", GF7 = "F#7", AF7 = "G#7",
    BF7 = "A#7"
}


export enum eDuration {
    Whole = "1n",
    Half = "2n",
    Quarter = "4n",
    Eighth = "8n",
    Sixteenth = "16n",
    ThirtySecond = "32n",

    n1 = "1n",
    n2 = "2n",
    n4 = "4n",
    n8 = "8n",
    n16 = "16n",
    n32 = "32n",


    "𝅝" = "1n",  // Whole
    "𝅗𝅥" = "2n",  // Half
    "♩" = "4n",  // Quarter
    "♪" = "8n",  // Eighth
    "♫" = "16n", // Sixteenth
    "♬" = "32n"  // Thirty-second

}
export class CVSTSheet
{
    constructor(_attack : boolean,_note : string,_time : number,_volume=1)
    {
        this.mAttack=_attack;
        this.mNote=_note;
        this.mTime=_time;
        this.mVolume=_volume;
    }
    mAttack=true;
    mNote="C4";
    mTime=0;
    mDelay=0;
    mVolume=1;
}
export class CVSTTrack
{
    mSheets=new Array<CVSTSheet>();
    mInstrument=eInstrument.TonsSynth;
    mScale=new Array<string>();
    mTempo=120;
}

export class CVST
{
    static eInstrument = eInstrument;
    static eNote = eNote;
    static eDuration = eDuration;
    mUse = new Array<string>;

    async Init(_count=6){return true;}
    async SetInstrument(_ins: eInstrument,_count){}
   
    Attack(_note: eNote|string,_volume=1) {}
    Release(_note: eNote|string) {}
    AttackRelease(_note: eNote | string, _duration: eDuration | string = eDuration.Eighth,_volume=1) {}
    //Play(_song: Array<CVSTTrack>,_bpm=120) {}
    //Stop() {}
    isValidNote(note: string): boolean {
        return /^[A-Ga-g]/.test(note);
    }
    
    ReleaseAll()
    {
        for(let use of this.mUse)
        {
            this.Release(use);
        }
    }
    IsUse(_note)
    {
        return this.mUse.includes(_note);
    }
    
}

export class CTons extends CVST
{
    
    mInsArr = new Array<any>;
    
    
    //m_eventIDs: Array<number> = []; // 스케줄된 이벤트 ID 저장용
    //m_activeNotes: Set<string> = new Set();
    async Init() 
    {
        
        if (Tone.getContext().state !== "running") 
        {
            await Tone.start();

            this.SetInstrument(eInstrument.TonsSynth,6);
            
            return false;
        }

        return true;
    }
   

    async SetInstrument(_ins: eInstrument,_count)
    {
        for(let i=0;i<_count;++i)
        {
            if (this.mInsArr[i]!=null && this.mInsArr[i].dispose) this.mInsArr[i].dispose();
                this.mUse[i]="";
            switch (_ins) 
            {
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
                // case eInstrument.TonsNoiseSynth:
                //     this.m_insArr[i] = new Tone.NoiseSynth().toDestination();
                //     break;
                // case eInstrument.TonsPolySynth:
                //     this.m_insArr[i] = new Tone.PolySynth(Tone.Synth).toDestination();
                //     break;
                default:
                    this.mInsArr[i] = new Tone.Synth().toDestination();
            }
        }
        
    }
    

    Attack(_note: eNote|string,_volume=1) 
    {
        
    }

    Release(_note: eNote|string) 
    {
        
        
    }

    AttackRelease(_note: eNote | string, _duration: eDuration | string = eDuration.Eighth,_volume=1) 
    {
        
    }
}

const eInstrumentToSoundfontName: Partial<Record<eInstrument, string>> = {
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

var gInstrumentMap=new Map<string,any>();

export class CSoundFont extends CVST
{
    

    private mAudioCtx: AudioContext;

    
    mPlayer=[];
    mIns;
    mMasterGain;

    constructor() {
        super();
        this.mAudioCtx = GetAudioContext();
        // const gainNode = this.m_audioCtx.createGain();
        // gainNode.gain.value = 1.0; // 확인

        this.mMasterGain = this.mAudioCtx.createGain();
        this.mMasterGain.gain.value = 1.5; // 🔊 기본 볼륨 올림
        this.mMasterGain.connect(this.mAudioCtx.destination);
    }
    async SetInstrument(_ins: eInstrument,_count) {
        const name = eInstrumentToSoundfontName[_ins] || "acoustic_grand_piano";
    
        let load=gInstrumentMap.get(name);
        if(load==null)
        {
            let inst=await Soundfont.instrument(this.mAudioCtx, name, {
                soundfont: 'MusyngKite',
                format: 'mp3',
                nameToUrl: (name, soundfont = 'MusyngKite', format = 'mp3') => {
                    return CPath.PHPC()+`artgine/external/legacy/soundfont/MusyngKite/${name}-${format}.js`;
                }
            });
            gInstrumentMap.set(name,inst);
            load=inst;
        }
        this.mIns=load;
        for (let i = 0; i < _count; ++i)
        {
            this.mUse[i]="";
            this.mPlayer[i]=null;
        }
        


    }
    async Init(_count: number = 6, _instrument: eInstrument = eInstrument.SoundFontAcousticGrand) {
        
    
        
        await this.SetInstrument(_instrument,_count);
    
        return true;
    }
    

    Attack(note: string, volume = 1) 
    {
        
        //console.warn("No available player slot for note:", note);
    }

    Release(note: string) 
    {
        
    }

    AttackRelease(note: string, duration: string | number = "8n", _volume = 1) 
    {
        
    }
   
}
export class CSong
{
    static eType=
    {
        Tone:"Tone",
        SoundFont:"SoundFont",
    }
    mVTSArr=new Array<CVST>();
    Play(_type,_song: Array<CVSTTrack>,_trackPlay=null,_delay=0) 
    {
        this.Stop();
        const startTime = GetAudioContext().currentTime*1000;
        for (let j = 0; j < _song.length; ++j) 
        {
            if(_trackPlay!=null && _trackPlay.length>j&&_trackPlay[j]==false)    continue;

            const track = _song[j];
            let vts : CVST;
            if(_type==CSong.eType.Tone) vts=new CTons();
            else if(_type==CSong.eType.SoundFont) vts=new CSoundFont();

            vts.SetInstrument(track.mInstrument,6);
            this.mVTSArr.push(vts);
            for (let i = 0; i < track.mSheets.length; ++i) {
                const sheet = track.mSheets[i];
                const time = startTime + (sheet.mTime+_delay);
    
                setTimeout(() => {
                    //CConsol.Log(sheet.m_time);
                    if (sheet.mAttack) {
                        vts.Attack(sheet.mNote, sheet.mVolume);
                    } else {
                        vts.Release(sheet.mNote);
                    }
                }, time); // ms 단위 스케줄링
            }
        }
    }
    Stop() {
        
        for (let i = 0; i < this.mVTSArr.length; ++i) {
            this.mVTSArr[i].ReleaseAll();
        }
        this.mVTSArr=new Array<CVST>();
    }
    static On(_song: Array<CVSTTrack>,_trackOff,_event : ((...args: any[]) => any) | CEvent<(...args: any[]) => any>)
    {
        _event=CEvent.ToCEvent(_event);
        
        const track = _song[_trackOff];
        const startTime = GetAudioContext().currentTime*1000;
        for (let i = 0; i < track.mSheets.length; ++i) {
            const sheet = track.mSheets[i];
            const time = startTime + sheet.mTime;

            setTimeout(() => {
                _event.Call(sheet);
            }, time); // ms 단위 스케줄링
        }
    
    }

    static ParseMML(source: string,_instrument : Array<eInstrument>=[]): Array<CVSTTrack>
    {
        return null;
    }
}
import CVTS_imple from "../util_imple/CVTS.js";
CVTS_imple();