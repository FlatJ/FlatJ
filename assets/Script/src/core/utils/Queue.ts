export class Queue<T> {
    protected get content(): T[] {
        if (!this.mContent) this.mContent = [];
        return this.mContent;
    }
    private mContent: T[];

    isEmpty(): boolean {
        return !this.mContent || this.mContent.length <= 0;
    }

    size(): number {
        return this.mContent && this.mContent.length;
    }

    list(): T[] {
        return this.mContent;
    }

    clear(): void {
        this.mContent = null;
    }

    inqueue(item: T): void {
        this.content.push(item);
    }

    outqueue(): T {
        return this.content.shift();
    }
}