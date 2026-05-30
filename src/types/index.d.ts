declare module 'imap' {
  class IMAP {
    constructor(config: any);
    openBox(mailbox: string, openReadOnly: boolean, callback: (err: Error | null, mailbox: any) => void): void;
    search(criteria: string[], callback: (err: Error | null, results: number[]) => void): void;
    fetch(source: string, options: any): any;
    addFlags(uid: string, flags: string[], callback: (err: Error | null) => void): void;
    end(): void;
  }
  export = IMAP;
}

declare module 'mailparser' {
  export function simpleParser(source: any, callback: (err: Error | null, parsed: any) => void): void;
}
