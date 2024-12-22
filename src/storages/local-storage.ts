export class LocalStorage {
	private storage: Map<string, Record<string, unknown>> = new Map();

	/**
	 * 특정 키에 전체 데이터를 설정합니다.
	 */
	public set<T extends Record<string, unknown>>({
		key,
		value,
	}: {
		key: string;
		value: T;
	}) {
		this.storage.set(key, value);
	}

	/**
	 * 특정 키와 필드에 데이터를 설정합니다.
	 */
	public setField<T extends Record<string, unknown>>({
		key,
		field,
		value,
	}: {
		key: string;
		field: keyof T;
		value: T[keyof T];
	}) {
		if (!this.storage.has(key)) {
			this.storage.set(key, {});
		}

		const data = this.storage.get(key) as T;
		if (!data) {
			throw new Error(
				`"${key}"에 해당하는 데이터를 초기화하는 중 문제가 발생했습니다.`,
			);
		}

		data[field] = value;
	}

	/**
	 * 특정 키에 저장된 전체 데이터를 가져옵니다.
	 */
	public get<T extends Record<string, unknown>>({
		key,
	}: {
		key: string;
	}) {
		const data = this.storage.get(key);
		if (!data) {
			throw new Error(`"${key}"에 해당하는 데이터를 찾을 수 없습니다.`);
		}
		return data as T;
	}

	/**
	 * 특정 키와 필드에 저장된 데이터를 가져옵니다.
	 */
	public getField<T extends Record<string, unknown>>({
		key,
		field,
	}: {
		key: string;
		field: keyof T;
	}) {
		if (!this.storage.has(key)) {
			throw new Error(`"${key}"에 해당하는 데이터를 찾을 수 없습니다.`);
		}

		const data = this.storage.get(key) as T;
		if (!(field in data)) {
			throw new Error(
				`"${key}"의 "${String(field)}" 필드가 존재하지 않습니다.`,
			);
		}

		return data[field];
	}

	/**
	 * 특정 키에 저장된 데이터가 존재하는지 확인합니다.
	 */
	public has({
		key,
		field,
	}: {
		key: string;
		field: string;
	}) {
		const data = this.storage.get(key);
		if (!data) return false;

		return field in data;
	}

	/**
	 * 특정 키에 저장된 데이터를 삭제합니다.
	 */
	public delete({ key }: { key: string }) {
		this.storage.delete(key);
	}

	/**
	 * 전체 데이터를 초기화합니다.
	 */
	public clear() {
		this.storage.clear();
	}
}
