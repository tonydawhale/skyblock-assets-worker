import chalk from 'chalk';

export default class Logger {
    time() {
        return new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    }
    info(message: any, error?: boolean) {
        return console.log(
            error
                ? chalk.bgWhiteBright.red(`ERROR [${this.time()}] INFO >`)
                : chalk.bgWhiteBright.black(`[${this.time()}] INFO >`),
            ' ',
            chalk.blueBright(message),
        );
    }
}
