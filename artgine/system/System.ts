export interface IFile
{
    SaveJSON(_file: string) : Promise<void>;
    LoadJSON(_file: string) : Promise<boolean>;
}