import dayjs from "dayjs";
import * as isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import * as isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";

dayjs.extend(isSameOrAfter.default);
dayjs.extend(isSameOrBefore.default);

export default dayjs;
