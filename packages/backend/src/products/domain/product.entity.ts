export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public readonly imageUrl: string,
    public readonly categoria: string,
    public readonly metadata: Record<string, any>,
    public readonly rating: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    // Validar que rating esté entre 1 y 5
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
  }

  static fromPersistence(data: any): Product {
    // Normalizar rating: si no existe, es 0, o está fuera de rango, usar 1
    let rating = data.rating;
    if (!rating || rating < 1 || rating > 5) {
      rating = 1;
    }
    // Asegurar que rating esté en el rango válido
    rating = Math.max(1, Math.min(5, rating));

    return new Product(
      data.id,
      data.name,
      data.description,
      data.price,
      data.imageUrl,
      data.categoria || '',
      data.metadata || {},
      rating,
      new Date(data.createdAt),
      new Date(data.updatedAt),
    );
  }

  toPersistence(): any {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      imageUrl: this.imageUrl,
      categoria: this.categoria,
      metadata: this.metadata,
      rating: this.rating,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
