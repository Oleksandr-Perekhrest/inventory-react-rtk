// outsource dependencies
import * as z from "zod";

// local dependencies
import type { Db } from "../../db";
import type { Supplier } from "../../../domain";

export const suppliersQuerySchema = z.object({});

export function listSuppliers({ db }: { db: Db }): { body: Supplier[] } {
    const sorted = [...db.suppliers].sort((a, b) =>
        a.name.localeCompare(b.name),
    );
    return { body: sorted };
}
