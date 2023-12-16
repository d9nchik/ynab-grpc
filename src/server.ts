import {
    AccountType,
    GetBudgetsRequest,
    GetBudgetsResponse,
    GetTransactionsByAccountRequest,
    GetTransactionsByAccountResponse, TransactionClearedStatus, TransactionFlagColor,
    UpdateTransactionsRequest,
    UpdateTransactionsResponse,
    YnabAPIServer
} from "../generated/contract";
import {sendUnaryData, ServerUnaryCall, UntypedHandleCall} from "@grpc/grpc-js";
import * as ynab from "ynab";

export class YnabAPIServ implements YnabAPIServer {
    async updateTransactions(call: ServerUnaryCall<UpdateTransactionsRequest, UpdateTransactionsResponse>, callback: sendUnaryData<UpdateTransactionsResponse>) {
        try {
            const ynabAPI = new ynab.API(call.request.authentication?.accessToken || '');
            const transactions: Array<ynab.SaveTransactionWithId> = call.request.patchTransactionWrapper?.transactions.map(t => ({
                id: t.id || undefined,
                account_id: t.accountId || undefined,
                date: t.date || undefined,
                amount: t.amount || undefined,
                payee_id: t.payeeId || undefined,
                payee_name: t.payeeName || undefined,
                category_id: t.categoryId || undefined,
                memo: t.memo || undefined,
                cleared: protoTypeToClear(t.cleared),
                approved: t.approved || undefined,
                flag_color: protoTypeToFlagColor(t.flagColor),
                import_id: t.importId || undefined,
                subtransactions: t.subtransactions?.map(s => ({
                    amount: s.amount,
                    memo: s.memo || undefined,
                    payee_id: s.payeeId || undefined,
                    payee_name: s.payeeName || undefined,
                    category_id: s.categoryId || undefined,
                }))
            })) || [];

            const response = await ynabAPI.transactions.updateTransactions(call.request.budgetId, {transactions});

            callback(null, {
                serverKnowledge: response.data.server_knowledge,
            })

        } catch (e) {
            console.log(e);
            callback(new Error("internal error"), null);
        }
    }


    async getTransactionsByAccount(call: ServerUnaryCall<GetTransactionsByAccountRequest, GetTransactionsByAccountResponse>, callback: sendUnaryData<GetTransactionsByAccountResponse>) {
        try {
            const ynabAPI = new ynab.API(call.request.authentication?.accessToken || '');

            let transactions: ynab.TransactionsResponse;
            if (call.request.serverKnowledge) {
                transactions = await ynabAPI.transactions.getTransactionsByAccount(call.request.budgetId, call.request.accountId, undefined, undefined, call.request.serverKnowledge);
            } else {
                transactions = await ynabAPI.transactions.getTransactionsByAccount(call.request.budgetId, call.request.accountId);
            }

            const res: GetTransactionsByAccountResponse = {
                serverKnowledge: transactions.data.server_knowledge,
                transactions: transactions.data.transactions.map(t => ({
                    id: t.id,
                    date: t.date,
                    amount: t.amount,
                    memo: t.memo || '',
                    cleared: clearToProtoType(t.cleared),
                    approved: t.approved,
                    flagColor: transactionFlagColorToProtoType(t.flag_color),
                    accountId: t.account_id,
                    payeeId: t.payee_id || '',
                    categoryId: t.category_id || '',
                    transferAccountId: t.transfer_account_id || '',
                    transferTransactionId: t.transfer_transaction_id || '',
                    matchedTransactionId: t.matched_transaction_id || '',
                    importId: t.import_id || '',
                    deleted: t.deleted,
                    importPayeeName: t.import_payee_name || '',
                    importPayeeNameOriginal: t.import_payee_name_original || '',
                    accountName: t.account_name || '',
                    payeeName: t.payee_name || '',
                    categoryName: t.category_name || '',
                    subtransactions: t.subtransactions?.map(s => ({
                        id: s.id,
                        transactionId: s.transaction_id,
                        amount: s.amount,
                        memo: s.memo || '',
                        payeeId: s.payee_id || '',
                        payeeName: s.payee_name || '',
                        categoryId: s.category_id || '',
                        categoryName: s.category_name || '',
                        transferAccountId: s.transfer_account_id || '',
                        transferTransactionId: s.transfer_transaction_id || '',
                        deleted: s.deleted,
                    }))
                }))
            }
            callback(null, res);
        } catch (e) {
            console.log(e);
            callback(new Error("internal error"), null);
        }
    }


    async getBudgets(call: ServerUnaryCall<GetBudgetsRequest, GetBudgetsResponse>, callback: sendUnaryData<GetBudgetsResponse>) {
        try {
            const ynabAPI = new ynab.API(call.request.authentication?.accessToken || '');
            const budgets = await ynabAPI.budgets.getBudgets(true);
            const output: GetBudgetsResponse = {
                budgets: budgets.data.budgets.map(b => ({
                    id: b.id,
                    name: b.name,
                    lastModifiedOn: b.last_modified_on || '',
                    firstMonth: b.first_month || '',
                    lastMonth: b.last_month || '',
                    dateFormat: {format: b.date_format?.format || ''},
                    currencyFormat: {
                        isoCode: b.currency_format?.iso_code || '',
                        exampleFormat: b.currency_format?.example_format || '',
                        decimalDigits: b.currency_format?.decimal_digits || 0,
                        decimalSeparator: b.currency_format?.decimal_separator || '',
                        symbolFirst: b.currency_format?.symbol_first || false,
                        groupSeparator: b.currency_format?.group_separator || '',
                        currencySymbol: b.currency_format?.currency_symbol || '',
                        displaySymbol: b.currency_format?.display_symbol || false
                    },
                    accounts: b.accounts?.map(a => ({
                        id: a.id,
                        name: a.name,
                        type: accountTypeToProtoType(a.type),
                        onBudget: a.on_budget,
                        closed: a.closed,
                        note: a.note || '',
                        balance: a.balance,
                        clearedBalance: a.cleared_balance,
                        unclearedBalance: a.uncleared_balance,
                        transferPayeeId: a.transfer_payee_id || '',
                        deleted: a.deleted,
                        directImportLinked: a.direct_import_linked || false,
                        directImportInError: a.direct_import_in_error || false,
                        lastReconciledAt: a.last_reconciled_at || '',
                        debtOriginalBalance: a.debt_original_balance || 0,
                    })) || []
                }))
            };

            callback(null, output);
        } catch (e) {
            console.log(e);
            callback(new Error("internal error"), null);
        }
    }

    [name: string]: UntypedHandleCall;
}

function accountTypeToProtoType(accountType: ynab.AccountType): AccountType {
    switch (accountType) {
        case ynab.AccountType.Checking:
            return AccountType.CHECKING;
        case ynab.AccountType.Savings:
            return AccountType.SAVINGS;
        case ynab.AccountType.Cash:
            return AccountType.CASH;
        case ynab.AccountType.CreditCard:
            return AccountType.CREDIT_CARD;
        case ynab.AccountType.LineOfCredit:
            return AccountType.LINE_OF_CREDIT;
        case ynab.AccountType.OtherAsset:
            return AccountType.OTHER_ASSET;
        case ynab.AccountType.OtherLiability:
            return AccountType.OTHER_LIABILITY;
        case ynab.AccountType.Mortgage:
            return AccountType.MORTGAGE;
        case ynab.AccountType.AutoLoan:
            return AccountType.AUTO_LOAN;
        case ynab.AccountType.StudentLoan:
            return AccountType.STUDENT_LOAN;
        case ynab.AccountType.PersonalLoan:
            return AccountType.PERSONAL_LOAN;
        case ynab.AccountType.MedicalDebt:
            return AccountType.MEDICAL_DEBT;
        case ynab.AccountType.OtherDebt:
            return AccountType.OTHER_DEBT;
    }
}

function clearToProtoType(cleared: ynab.TransactionClearedStatus): TransactionClearedStatus {
    switch (cleared) {
        case ynab.TransactionClearedStatus.Cleared:
            return TransactionClearedStatus.CLEARED;
        case ynab.TransactionClearedStatus.Uncleared:
            return TransactionClearedStatus.UNCLEARED;
        case ynab.TransactionClearedStatus.Reconciled:
            return TransactionClearedStatus.RECONCILED;
    }
}

function transactionFlagColorToProtoType(flagColor: ynab.TransactionFlagColor | null | undefined): TransactionFlagColor {
    switch (flagColor) {
        case ynab.TransactionFlagColor.Red:
            return TransactionFlagColor.RED;
        case ynab.TransactionFlagColor.Orange:
            return TransactionFlagColor.ORANGE;
        case ynab.TransactionFlagColor.Yellow:
            return TransactionFlagColor.YELLOW;
        case ynab.TransactionFlagColor.Green:
            return TransactionFlagColor.GREEN;
        case ynab.TransactionFlagColor.Blue:
            return TransactionFlagColor.BLUE;
        case ynab.TransactionFlagColor.Purple:
            return TransactionFlagColor.PURPLE
        default:
            return TransactionFlagColor.FLAG_COLOR_UNSPECIFIED;
    }
}

function protoTypeToClear(cleared: TransactionClearedStatus): ynab.TransactionClearedStatus | undefined {
    switch (cleared) {
        case TransactionClearedStatus.CLEARED:
            return ynab.TransactionClearedStatus.Cleared;
        case TransactionClearedStatus.UNCLEARED:
            return ynab.TransactionClearedStatus.Uncleared;
        case TransactionClearedStatus.RECONCILED:
            return ynab.TransactionClearedStatus.Reconciled;
    }
}

function protoTypeToFlagColor(flagColor: TransactionFlagColor): ynab.TransactionFlagColor | undefined {
    switch (flagColor) {
        case TransactionFlagColor.RED:
            return ynab.TransactionFlagColor.Red;
        case TransactionFlagColor.ORANGE:
            return ynab.TransactionFlagColor.Orange;
        case TransactionFlagColor.YELLOW:
            return ynab.TransactionFlagColor.Yellow;
        case TransactionFlagColor.GREEN:
            return ynab.TransactionFlagColor.Green;
        case TransactionFlagColor.BLUE:
            return ynab.TransactionFlagColor.Blue;
        case TransactionFlagColor.PURPLE:
            return ynab.TransactionFlagColor.Purple;
        case TransactionFlagColor.FLAG_COLOR_UNSPECIFIED:
            return undefined;
    }
}