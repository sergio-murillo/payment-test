export class Event {
  constructor(
    public readonly aggregateId: string,
    public readonly eventType: string,
    public readonly eventData: any,
    public readonly timestamp: Date,
    public readonly id?: string,
  ) {}

  static fromPersistence(data: any): Event {
    return new Event(
      data.aggregateId,
      data.eventType,
      data.eventData,
      new Date(data.eventTimestamp),
      data.id,
    );
  }

  toPersistence(): any {
    return {
      id: this.id || `${this.aggregateId}-${this.timestamp.getTime()}`,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      eventData: this.eventData,
      eventTimestamp: this.timestamp.getTime(),
      timestamp: this.timestamp.toISOString(),
    };
  }
}
