import {AccountType, GetBudgetsRequest, GetBudgetsResponse, YnabAPIServer} from "../generated/contract";
import {sendUnaryData, ServerUnaryCall, UntypedHandleCall} from "@grpc/grpc-js";
import * as ynab from "ynab";

export class YnabAPIServ implements YnabAPIServer {


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