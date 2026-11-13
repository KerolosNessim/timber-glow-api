export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`)
