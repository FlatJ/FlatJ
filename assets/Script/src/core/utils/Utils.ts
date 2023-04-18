export class Utils {
    /**
     * 从给定的参数列表中返回第一个非null的值，如果没有任何值满足要求则返回最后一个参数的值
     * @param  {...any} args 
     */
    validate(...args) {
        let n = args.length - 1;
        for (let i = 0; i < n; i++) {
            if (args[i] != null) {
                return args[i];
            }
        }
        return args[n];
    }
}
